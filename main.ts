import { propsDictionary } from "./data/propsDictionary";

pixso.showUI(__html__, { width: 720, height: 560 });

type NormalizedProp = {
  pixsoName: string;
  name: string;
  designName: string;
  codeName: string;
  type: string;
  description: string;
  category: string;
  values: string[] | null;
  defaultValue: any;
  status: string;
  suggestedName: string | null;
};

type InspectResult = {
  component: string | null;
  type: string | null;
  description: string;
  props: NormalizedProp[];
  validation: {
    total: number;
    ok: number;
    review: number;
    wrongCase: number;
    unknown: number;
  };
};

let lastInspectResult: InspectResult | null = null;
let lastInspectedNode: any = null;

let variantIndexCache = new Map<any, any[]>();
let defaultPropsCache: Record<string, any> | null = null;
let variantResolverCache = new Map<any, Map<string, any>>();

const loadedFonts = new Set<string>();

function cleanPropName(name: string): string {
  return String(name).split("#")[0].trim();
}

function normalizePixsoName(name: string): string {
  const cleaned = cleanPropName(name);
  if (cleaned.startsWith(" ")) {
    return cleaned.replace(" ", "").trim();
  }
  return cleaned;
}

function findDictionaryEntry(pixsoName: string, normalizedName: string) {
  const direct =
    propsDictionary[pixsoName as keyof typeof propsDictionary] ||
    propsDictionary[normalizedName as keyof typeof propsDictionary] ||
    null;

  if (direct) {
    if (pixsoName === direct.designName) {
      return { dict: direct, status: "OK", suggestedName: direct.designName };
    }

    if (pixsoName.toLowerCase() === String(direct.designName).toLowerCase()) {
      return {
        dict: direct,
        status: "WRONG_CASE",
        suggestedName: direct.designName,
      };
    }

    return {
      dict: direct,
      status: "REVIEW",
      suggestedName: direct.designName,
    };
  }

  const lowerPixso = pixsoName.toLowerCase();

  const matchedKey = Object.keys(propsDictionary).find((key) => {
    const item = propsDictionary[key as keyof typeof propsDictionary];
    return (
      key.toLowerCase() === lowerPixso ||
      String(item.designName).toLowerCase() === lowerPixso ||
      String(item.codeName).toLowerCase() === lowerPixso
    );
  });

  if (matchedKey) {
    const dict = propsDictionary[matchedKey as keyof typeof propsDictionary];

    if (pixsoName === dict.designName) {
      return { dict, status: "OK", suggestedName: dict.designName };
    }

    if (pixsoName.toLowerCase() === String(dict.designName).toLowerCase()) {
      return {
        dict,
        status: "WRONG_CASE",
        suggestedName: dict.designName,
      };
    }

    return {
      dict,
      status: "REVIEW",
      suggestedName: dict.designName,
    };
  }

  return {
    dict: null,
    status: "UNKNOWN",
    suggestedName: null,
  };
}

function normalizeProp(propName: string, propData: any): NormalizedProp {
  const pixsoName = cleanPropName(propName);
  const normalizedName = normalizePixsoName(pixsoName);
  const match = findDictionaryEntry(pixsoName, normalizedName);
  const dict = match.dict;

  return {
    pixsoName,
    name: normalizedName,
    designName: dict?.designName || normalizedName,
    codeName: dict?.codeName || normalizedName,
    type: dict?.type || propData?.type || "UNKNOWN",
    description: dict?.description || "",
    category: dict?.category || "",
    values: propData?.variantOptions || null,
    defaultValue:
      propData?.defaultValue !== undefined ? propData.defaultValue : null,
    status: match.status,
    suggestedName: match.suggestedName,
  };
}

function inspectSelectedNode() {
  const selection = pixso.currentPage.selection;

  if (!selection.length) {
    pixso.notify("Выберите компонент");
    pixso.ui.postMessage({
      type: "result",
      data: { error: "Ничего не выбрано" },
    });
    return;
  }

  const node = selection[0] as any;
  lastInspectedNode = node;
  const propDefinitions = node.componentPropertyDefinitions || {};

  const props = Object.entries(propDefinitions).map(([name, data]) =>
    normalizeProp(name, data)
  );

  const validation = {
    total: props.length,
    ok: props.filter((p) => p.status === "OK").length,
    review: props.filter((p) => p.status === "REVIEW").length,
    wrongCase: props.filter((p) => p.status === "WRONG_CASE").length,
    unknown: props.filter((p) => p.status === "UNKNOWN").length,
  };

  lastInspectResult = {
    component: node.name || null,
    type: node.type || null,
    description: node.description || "",
    props,
    validation,
  };

  defaultPropsCache = Object.fromEntries(
  props.map((p) => [p.pixsoName, p.defaultValue])
);

  pixso.ui.postMessage({
    type: "result",
    data: lastInspectResult,
  });
}

async function loadTextNodeFontSafe(node: TextNode) {
  try {
    const fontKey = JSON.stringify(node.fontName);

    if (loadedFonts.has(fontKey)) {
      return;
    }

    await pixso.loadFontAsync(node.fontName as FontName);
    loadedFonts.add(fontKey);
  } catch (e) {
    console.log("Font load error", e);
  }
}

function findNodeByName(root: any, name: string): any | null {
  if (!root) return null;
  if (root.name === name) return root;

  const children = root.children;
  if (!children || !Array.isArray(children)) return null;

  for (const child of children) {
    const found = findNodeByName(child, name);
    if (found) return found;
  }

  return null;
}

function getCachedVariants(sourceNode: any): any[] {
  if (!sourceNode || sourceNode.type !== "COMPONENT_SET") return [];

  if (variantIndexCache.has(sourceNode)) {
    return variantIndexCache.get(sourceNode) || [];
  }

  const variants = Array.isArray(sourceNode.children) ? sourceNode.children : [];
  variantIndexCache.set(sourceNode, variants);

  return variants;
}

function buildVariantResolverKey(props: Record<string, any>) {
  return Object.entries(props)
    .filter(([, value]) => value !== null && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value).toLowerCase()}`)
    .join("|");
}

function getVariantResolver(sourceNode: any) {
  if (!sourceNode || sourceNode.type !== "COMPONENT_SET") return null;

  if (variantResolverCache.has(sourceNode)) {
    return variantResolverCache.get(sourceNode);
  }

  const resolver = new Map<string, any>();
  const variants = getCachedVariants(sourceNode);

  for (const variant of variants) {
    const name = String(variant.name || "");
    const parts = name.split(",");

    const props: Record<string, any> = {};

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (!key || value === undefined) continue;
      props[key.trim()] = value.trim().toLowerCase();
    }

    const key = buildVariantResolverKey(props);
    resolver.set(key, variant);
  }

  variantResolverCache.set(sourceNode, resolver);
  return resolver;
}

async function setTextInNamedContainer(
  root: any,
  containerName: string,
  value: string
) {
  const container = findNodeByName(root, containerName);
  if (!container) return;

  const textNode = findNodeByName(container, "text") as TextNode | null;
  if (!textNode) return;

  await loadTextNodeFontSafe(textNode);
  textNode.characters = value || "";
}

function buildDesignText(prop: NormalizedProp): string {
  const valuesText =
    prop.values && prop.values.length ? ` [${prop.values.join(", ")}]` : "";
  const description = prop.description ? `: ${prop.description}` : "";
  return `${prop.designName}${valuesText}${description}`;
}

function buildDevText(prop: NormalizedProp): string {
  const typeText = prop.type ? `[${prop.type}]` : "";
  const defaultText =
    prop.defaultValue !== null && prop.defaultValue !== undefined
      ? ` Default: ${String(prop.defaultValue)}`
      : "";
  return `${prop.codeName} ${typeText}${defaultText}`.trim();
}

function buildInfoText(prop: NormalizedProp): string {
  const parts: string[] = [];

  if (prop.category) parts.push(`Category: ${prop.category}`);
  if (prop.status) parts.push(`Status: ${prop.status}`);
  if (prop.suggestedName && prop.suggestedName !== prop.designName) {
    parts.push(`Suggested: ${prop.suggestedName}`);
  }

  return parts.join(" · ");
}

function getDemoValues(prop: NormalizedProp): string[] {

  // boolean
  if (prop.type === "boolean") {
    return ["true", "false"];
  }

  // enum / variants
  if (prop.values && prop.values.length) {
    return prop.values.map(String);
  }

  return [];
}

async function buildPropDemos(blockRoot: any, prop: NormalizedProp, sourceNode: any) {

  const leftSection = findNodeByName(blockRoot, "leftSection");
  if (!leftSection) return;

  const demoTemplate = findNodeByName(leftSection, "block");
  if (!demoTemplate) return;

  const values = getDemoValues(prop);
  if (!values.length) return;

  const templateClone = typeof demoTemplate.clone === "function"
  ? demoTemplate.clone()
  : null;

  if (!templateClone) return;

  // очищаем leftSection
  const children = [...leftSection.children];
  for (const child of children) {
    if (typeof child.remove === "function") child.remove();
  }

  for (const value of values) {

    const row = typeof templateClone.clone === "function"
      ? templateClone.clone()
      : null;

    if (!row) continue;

  await fillDemoRow(row, prop, value, sourceNode);

    leftSection.appendChild(row);
  }

    if (typeof templateClone.remove === "function") {
    templateClone.remove();
  }
}

function createDemoInstance(sourceNode: any, prop?: NormalizedProp, value?: string) {
  if (!sourceNode) return null;

  if (sourceNode.type === "COMPONENT_SET") {
    const variants = getCachedVariants(sourceNode);
    const resolver = getVariantResolver(sourceNode);

    const defaults = defaultPropsCache || {};

    const target = defaults ? { ...defaults } : {};

  if (prop && value !== undefined) {
    target[prop.pixsoName] =
      value === "true" ? true :
      value === "false" ? false :
      value;
  }

    const resolverKey = buildVariantResolverKey(target);
  const resolvedVariant = resolver?.get(resolverKey);

  if (resolvedVariant && typeof resolvedVariant.createInstance === "function") {
    return resolvedVariant.createInstance();
  }

    const scoreVariant = (variant: any) => {
      const name = String(variant.name || "").toLowerCase();
      let score = 0;

      for (const [key, val] of Object.entries(target)) {
        const expected = `${String(key).toLowerCase()}=${String(val).toLowerCase()}`;
        const expectedAlt = `${String(key).toLowerCase()} = ${String(val).toLowerCase()}`;

        if (name.includes(expected) || name.includes(expectedAlt)) {
          score += 1;
        }
      }

      return score;
    };

    const matchedVariant =
      variants
        .map((variant: any) => ({ variant, score: scoreVariant(variant) }))
        .sort((a: any, b: any) => b.score - a.score)[0]?.variant || variants[0];

    if (matchedVariant && typeof matchedVariant.createInstance === "function") {
      return matchedVariant.createInstance();
    }
  }

  if (sourceNode.type === "COMPONENT" && typeof sourceNode.createInstance === "function") {
    return sourceNode.createInstance();
  }

  return null;
}

function getCachedNode(cache: Map<string, any>, root: any, name: string) {
  if (cache.has(name)) {
    return cache.get(name);
  }

  const node = findNodeByName(root, name);
  cache.set(name, node);

  return node;
}

function getPropBlockNodes(block: any) {
  const cache = new Map<string, any>();

  return {
    title:
      getCachedNode(cache, block, "title") ||
      getCachedNode(cache, block, "Header") ||
      getCachedNode(cache, block, "text"),

    design: getCachedNode(cache, block, "item/design"),
    dev: getCachedNode(cache, block, "item/dev"),
    info: getCachedNode(cache, block, "item/info"),
  };
}

async function fillDemoRow(row: any, prop: NormalizedProp, value: string, sourceNode: any) {

  const nodeCache = new Map<string, any>();
    
  const demoDescriptor = getCachedNode(nodeCache, row, "demoDescriptor");
  if (demoDescriptor && "visible" in demoDescriptor) {
    demoDescriptor.visible = true;
  }

  const textNode = demoDescriptor ? getCachedNode(nodeCache, demoDescriptor, "text") : null;
  if (textNode && textNode.type === "TEXT") {
    await loadTextNodeFontSafe(textNode);
    textNode.characters = `${prop.designName || prop.name} = ${value}`;
  }

  const demoPlaceholder =
  getCachedNode(nodeCache, row, "demo-placeholder") ||
  getCachedNode(nodeCache, row, "demoPlaceholder");

  const instance = createDemoInstance(sourceNode, prop, value);

  if (instance && typeof instance.setProperties === "function") {
  const instanceProps = instance.componentProperties || {};
  const resolvedPropKey =
    Object.keys(instanceProps).find((key) => key === prop.pixsoName) ||
    Object.keys(instanceProps).find((key) => key.startsWith(`${prop.pixsoName}#`));

  if (resolvedPropKey) {
    const parsedValue =
      value === "true" ? true :
      value === "false" ? false :
      value;

    instance.setProperties({
      [resolvedPropKey]: parsedValue
    });
  }
}

  if (demoPlaceholder && demoPlaceholder.parent && instance) {
  const parent = demoPlaceholder.parent;

    if (typeof demoPlaceholder.remove === "function") {
      demoPlaceholder.remove();
    }

    if (typeof parent.appendChild === "function") {
      parent.appendChild(instance);
    }
  }
}

async function fillPropBlock(block: any, prop: NormalizedProp, sourceNode: any) {
  const nodes = getPropBlockNodes(block);
  const titleText = nodes.title;

  if (titleText && titleText.type === "TEXT") {
    await loadTextNodeFontSafe(titleText);
    titleText.characters = prop.designName || prop.name;
  }

  await setTextInNamedContainer(block, "item/design", buildDesignText(prop));
  await setTextInNamedContainer(block, "item/dev", buildDevText(prop));
  await setTextInNamedContainer(block, "item/info", buildInfoText(prop));
  await buildPropDemos(block, prop, sourceNode);
}

async function generateDocumentation() {
  const startedAt = Date.now();
  try {
    if (!lastInspectResult) {
      pixso.notify("Сначала нажми Inspect component");
      return;
    }

    const template = findNodeByName(pixso.currentPage, "doc content block") as any;

    if (!template) {
      pixso.notify('Шаблон "doc content block" не найден на текущей странице');
      return;
    }

    const docFrame = pixso.createFrame();
    docFrame.name = `Doc / ${lastInspectResult.component || "Component"}`;
    docFrame.layoutMode = "VERTICAL";
    docFrame.itemSpacing = 24;
    docFrame.fills = [];

    if (typeof docFrame.resize === "function") {
      docFrame.resize(1200, 100);
    }

    let createdCount = 0;

    for (const prop of lastInspectResult.props) {
      pixso.ui.postMessage({
        type: "progress",
        current: createdCount + 1,
        total: lastInspectResult.props.length
      });
      
      if (typeof template.clone !== "function") {
        pixso.notify('У шаблона "doc content block" нет clone()');
        return;
      }

      const blockInstance = template.clone();
      const block = typeof blockInstance.detachInstance === "function"
        ? blockInstance.detachInstance()
        : blockInstance;
      block.name = `prop / ${prop.designName || prop.name}`;
      block.visible = true;

      await fillPropBlock(block, prop, lastInspectedNode);

        docFrame.appendChild(block);

      createdCount += 1;
    }

      pixso.currentPage.appendChild(docFrame);

      docFrame.x = (template.x || 0) + (template.width || 0) + 120;
      docFrame.y = template.y || 0;

        if ("selection" in pixso.currentPage) {
      pixso.currentPage.selection = [docFrame];
    }

    const duration = ((Date.now() - startedAt) / 1000).toFixed(2);

    pixso.notify(
          `Документация создана: ${lastInspectResult.component}. Блоков: ${createdCount}. Время: ${duration}s`
        );
      } catch (error) {
        console.error(error);
        pixso.notify(`Ошибка генерации: ${String(error)}`);
      } finally {
        pixso.ui.postMessage({
          type: "generation-finished"
        });
      }
}

pixso.ui.onmessage = async (msg) => {
  if (msg.type === "inspect") {
    inspectSelectedNode();
    return;
  }

  if (msg.type === "generate-documentation") {
    await generateDocumentation();
    return;
  }
};
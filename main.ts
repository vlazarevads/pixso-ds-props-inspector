import { propsDictionary } from "./data/propsDictionary";

pixso.showUI(__html__, { width: 720, height: 560 });

type NormalizedProp = {
  pixsoName: string;
  name: string;
  designName: string;
  codeName: string;
  designType: string;
  devType: string;
  description: string;
  category: string;
  values: string[] | null;
  defaultValue: any;
  status: string;
  suggestedName: string | null;
  dictionaryIndex: number | null;
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

function matchesDictionaryByPixsoType(dict: any, propData: any): boolean {
  const designType = String(propData?.type || "").toUpperCase();
  const category = String(dict?.category || "").toLowerCase();
  const devType = String(dict?.type || "").toLowerCase();

  // Все slot-похожие пропы в Pixso
  if (
    designType === "INSTANCE_SWAP" ||
    designType === "TEXT" ||
    designType === "VARIANT"
  ) {
    return category === "slot" || devType === "reactnode";
  }

  // Все visibility-похожие пропы в Pixso
  if (designType === "BOOLEAN") {
    return category === "visibility" || devType === "boolean";
  }

  return true;
}

function getAltDictionaryKey(name: string): string | null {
  if (!name) return null;

  const first = name.charAt(0);
  const upperFirst = first.toUpperCase() + name.slice(1);

  if (upperFirst !== name) return upperFirst;

  const lowerFirst = first.toLowerCase() + name.slice(1);
  if (lowerFirst !== name) return lowerFirst;

  return null;
}

function findDictionaryEntry(pixsoName: string, normalizedName: string, propData: any) {
  const dictionaryKeys = Object.keys(propsDictionary);

  const altPixsoKey = getAltDictionaryKey(pixsoName);
  const altNormalizedKey = getAltDictionaryKey(normalizedName);

  const directCandidates = [
    propsDictionary[pixsoName as keyof typeof propsDictionary],
    propsDictionary[normalizedName as keyof typeof propsDictionary],
    altPixsoKey
      ? propsDictionary[altPixsoKey as keyof typeof propsDictionary]
      : null,
    altNormalizedKey
      ? propsDictionary[altNormalizedKey as keyof typeof propsDictionary]
      : null,
  ].filter(Boolean);

  const direct =
    directCandidates.find((item) =>
      matchesDictionaryByPixsoType(item, propData)
    ) || directCandidates[0] || null;

  if (direct) {
    const directKeyCandidates = [
      pixsoName,
      normalizedName,
      altPixsoKey,
      altNormalizedKey,
    ].filter(Boolean) as string[];

    const directKey =
      directKeyCandidates.find((key) => {
        const item = propsDictionary[key as keyof typeof propsDictionary];
        return item === direct;
      }) || directKeyCandidates[0];

    const dictionaryIndex = dictionaryKeys.indexOf(directKey);

    if (pixsoName === direct.designName) {
      return {
        dict: direct,
        status: "OK",
        suggestedName: direct.designName,
        dictionaryIndex,
      };
    }

    if (pixsoName.toLowerCase() === String(direct.designName).toLowerCase()) {
      return {
        dict: direct,
        status: "WRONG_CASE",
        suggestedName: direct.designName,
        dictionaryIndex,
      };
    }

    return {
      dict: direct,
      status: "REVIEW",
      suggestedName: direct.designName,
      dictionaryIndex,
    };
  }

  const lowerPixso = pixsoName.toLowerCase();

  const matchedCandidates = Object.keys(propsDictionary).filter((key) => {
    const item = propsDictionary[key as keyof typeof propsDictionary];
    return (
      key.toLowerCase() === lowerPixso ||
      String(item.designName).toLowerCase() === lowerPixso ||
      String(item.codeName).toLowerCase() === lowerPixso
    );
  });

  const matchedKey =
    matchedCandidates.find((key) =>
      matchesDictionaryByPixsoType(
        propsDictionary[key as keyof typeof propsDictionary],
        propData
      )
    ) || matchedCandidates[0];

  if (matchedKey) {
    const dict = propsDictionary[matchedKey as keyof typeof propsDictionary];
    const dictionaryIndex = dictionaryKeys.indexOf(matchedKey);

    if (pixsoName === dict.designName) {
      return { 
        dict, status: "OK",
        suggestedName: dict.designName,
        dictionaryIndex,
      };
    }

    if (pixsoName.toLowerCase() === String(dict.designName).toLowerCase()) {
      return {
        dict,
        status: "WRONG_CASE",
        suggestedName: dict.designName,
        dictionaryIndex,
      };
    }

    return {
      dict,
      status: "REVIEW",
      suggestedName: dict.designName,
      dictionaryIndex,
    };
  }

  return {
    dict: null,
    status: "UNKNOWN",
    suggestedName: null,
    dictionaryIndex: null,
  };
}

function normalizeProp(propName: string, propData: any): NormalizedProp {
  const pixsoName = cleanPropName(propName);
  const normalizedName = normalizePixsoName(pixsoName);
  const match = findDictionaryEntry(pixsoName, normalizedName, propData);
  const dict = match.dict;

  return {
    pixsoName,
    name: normalizedName,
    designName: dict?.designName || normalizedName,
    codeName: dict?.codeName || normalizedName,
    designType: propData?.type || "UNKNOWN",
    devType: dict?.type || "",
    description: dict?.description || "",
    category: dict?.category || "",
    values: propData?.variantOptions || null,
    defaultValue:
      propData?.defaultValue !== undefined ? propData.defaultValue : null,
    status: match.status,
    suggestedName: match.suggestedName,
    dictionaryIndex: match.dictionaryIndex,
  };
}

function getPropSortWeight(prop: NormalizedProp): number {
  const designType = String(prop.designType || "").toUpperCase();

  if (prop.values && prop.values.length && !isBooleanLikeProp(prop)) return 1;
  if (isBooleanLikeProp(prop)) return 2;
  if (designType === "TEXT") return 3;
  if (designType === "INSTANCE_SWAP") return 4;

  return 99;
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

  const props = Object.entries(propDefinitions)
  .map(([name, data]) => normalizeProp(name, data))
  .sort((a, b) => {
    const aIndex = a.dictionaryIndex ?? Number.MAX_SAFE_INTEGER;
    const bIndex = b.dictionaryIndex ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });

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

  defaultPropsCache = props.reduce((acc, p) => {
    acc[p.pixsoName] = p.defaultValue;
    return acc;
  }, {} as Record<string, any>);

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

type StyledTextPayload = {
  text: string;
  boldRanges?: Array<{ start: number; end: number }>;
};

const loadedBoldFonts = new Set<string>();

async function setTextInNamedContainer(
  root: any,
  containerName: string,
  payload: string | StyledTextPayload
) {
  const container = findNodeByName(root, containerName);
  if (!container) return;

  const textNode = findNodeByName(container, "text") as TextNode | null;
  if (!textNode) return;

  await loadTextNodeFontSafe(textNode);

  const value =
    typeof payload === "string"
      ? { text: payload, boldRanges: [] }
      : payload;

  textNode.characters = value.text || "";

  if (!value.boldRanges?.length) return;

  const currentFont = textNode.fontName as FontName;
  const boldFont: FontName = {
    family: currentFont.family,
    style: "Bold",
  };

  try {
    const boldKey = JSON.stringify(boldFont);

    if (!loadedBoldFonts.has(boldKey)) {
      await pixso.loadFontAsync(boldFont);
      loadedBoldFonts.add(boldKey);
    }

    for (const range of value.boldRanges) {
      if (range.start < range.end) {
        textNode.setRangeFontName(range.start, range.end, boldFont);
      }
    }
  } catch (e) {
    console.log("Bold font load error", e);
  }
}

function isBooleanLikeProp(prop: NormalizedProp): boolean {
  const type = String(prop.designType || "").toUpperCase();

  if (type === "BOOLEAN") return true;

  if (prop.values && prop.values.length === 2) {
    const normalized = prop.values.map((v) => String(v).toLowerCase()).sort();
    return normalized[0] === "false" && normalized[1] === "true";
  }

  return false;
}

function getDesignTypeLabel(prop: NormalizedProp): string {
  const type = String(prop.designType || "").toUpperCase();

  if (isBooleanLikeProp(prop)) return "[boolean]";
  if (type === "TEXT") return "[string]";
  if (type === "INSTANCE_SWAP") return "[swap instance]";

  if (prop.values && prop.values.length) {
    return `[${prop.values.join(", ")}]`;
  }

  return "[string]";
}

function buildDesignText(prop: NormalizedProp): StyledTextPayload {
  const propName = prop.designName || prop.name;
  const typeLabel = getDesignTypeLabel(prop);
  const descriptor = prop.description || "";

  const head = `${propName} ${typeLabel}`;
  const text = descriptor ? `${head}: ${descriptor}` : head;

  return {
    text,
    boldRanges: [
      { start: 0, end: propName.length },
      { start: propName.length + 1, end: head.length },
    ],
  };
}

function buildDevText(prop: NormalizedProp): StyledTextPayload {
  const propName = prop.codeName || prop.name;
  const designType = String(prop.designType || "").toUpperCase();
  const devType = String(prop.devType || "").trim();

  let typeLabel = "";

  // 1. Главный источник истины для dev — словарь
  if (devType) {
    const normalizedDevType = devType.toLowerCase();

    if (normalizedDevType === "string") {
      typeLabel = "[string]";
    } else if (normalizedDevType === "boolean") {
      typeLabel = "[boolean]";
    } else if (normalizedDevType === "reactnode") {
      typeLabel = "[ReactNode]";
    } else {
      typeLabel = `[${devType}]`;
    }
  }
  // 2. Fallback только если в словаре типа нет
  else if (isBooleanLikeProp(prop)) {
    typeLabel = "";
  } else if (prop.values && prop.values.length) {
    typeLabel = `[${prop.values.join(", ")}]`;
  } else if (designType === "INSTANCE_SWAP") {
    typeLabel = "[ReactNode]";
  } else if (designType === "TEXT") {
    typeLabel = "[string]";
  }

  const head = typeLabel ? `${propName} ${typeLabel}` : propName;

  return {
    text: head,
    boldRanges: typeLabel
      ? [
          { start: 0, end: propName.length },
          { start: propName.length + 1, end: head.length },
        ]
      : [{ start: 0, end: propName.length }],
  };
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
  if (isBooleanLikeProp(prop)) {
    return ["true", "false"];
  }

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
  if (child.name === "block") {
    child.remove();
  }
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

  const demoDescriptor =
  getCachedNode(nodeCache, row, "description") ||
  getCachedNode(nodeCache, row, "demoDescription");

  if (demoDescriptor && "visible" in demoDescriptor) {
    demoDescriptor.visible = true;
  }

  const textNode = demoDescriptor
    ? getCachedNode(nodeCache, demoDescriptor, "text")
    : null;

  if (textNode && "visible" in textNode) {
    textNode.visible = true;
  }

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

      docFrame.appendChild(block);

      await fillPropBlock(block, prop, lastInspectedNode);

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
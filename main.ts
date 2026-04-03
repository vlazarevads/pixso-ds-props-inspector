import { propsDictionary } from "./data/propsDictionary";

pixso.showUI(__html__, { width: 720, height: 560 });

type NormalizedProp = {
  rawVariantOptions: string[] | null;
  rawPixsoName: string;
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

function getDictionaryVariants() {
  return Object.entries(propsDictionary).flatMap(([key, value]) => {
    const item = value as any;

    if (item?.variants) {
      return Object.entries(item.variants).map(([variantKey, variantValue]) => ({
        dictKey: key,
        variantKey,
        item: variantValue,
      }));
    }

    return [
      {
        dictKey: key,
        variantKey: null,
        item,
      },
    ];
  });
}

function findDictionaryEntry(pixsoName: string, normalizedName: string, propData: any) {
  const lowerPixso = pixsoName.toLowerCase();
  const lowerNormalized = normalizedName.toLowerCase();
  const allEntries = getDictionaryVariants();
  const dictionaryKeys = Object.keys(propsDictionary);

  const matchedCandidates = allEntries.filter(({ dictKey, item }) => {
    return (
      String(dictKey).toLowerCase() === lowerPixso ||
      String(dictKey).toLowerCase() === lowerNormalized ||
      String(item.designName).toLowerCase() === lowerPixso ||
      String(item.designName).toLowerCase() === lowerNormalized ||
      String(item.codeName).toLowerCase() === lowerPixso ||
      String(item.codeName).toLowerCase() === lowerNormalized
    );
  });

  const matched =
    matchedCandidates.find(({ item }) =>
      matchesDictionaryByPixsoType(item, propData)
    ) || matchedCandidates[0];

  if (!matched) {
    return null;
  }

  const { dictKey, item } = matched;
  const dictionaryIndex = dictionaryKeys.indexOf(dictKey);

  if (pixsoName === item.designName) {
    return {
      dict: item,
      status: "OK",
      suggestedName: item.designName,
      dictionaryIndex,
    };
  }

  if (pixsoName.toLowerCase() === String(item.designName).toLowerCase()) {
    return {
      dict: item,
      status: "WRONG_CASE",
      suggestedName: item.designName,
      dictionaryIndex,
    };
  }

  return {
    dict: item,
    status: "REVIEW",
    suggestedName: item.designName,
    dictionaryIndex,
  };
}

function hasSlotIcon(rawPixsoName: string): boolean {
  return String(rawPixsoName).trim().startsWith("🔄");
}

function getNameTypeConsistencyStatus(rawPixsoName: string, propData: any) {
  const withIcon = hasSlotIcon(rawPixsoName);
  const designType = String(propData?.type || "").toUpperCase();

  if (withIcon && designType !== "INSTANCE_SWAP") {
    return {
      status: "REVIEW",
      reason: "Slot prop with icon must use INSTANCE_SWAP",
    };
  }

  if (!withIcon && designType === "INSTANCE_SWAP") {
    return {
      status: "REVIEW",
      reason: "INSTANCE_SWAP prop must have slot icon",
    };
  }

  return null;
}

function getPropValues(propData: any): string[] | null {
  const designType = String(propData?.type || "").toUpperCase();
  const options = propData?.variantOptions;

  // 1. VARIANT с true/false → boolean
  if (Array.isArray(options) && options.length) {
    const normalized = options.map((v: any) => String(v).toLowerCase());

    const isBooleanLike =
      normalized.length === 2 &&
      normalized.includes("true") &&
      normalized.includes("false");

    if (isBooleanLike) {
      return ["boolean"];
    }

    return options.map((v: any) => String(v));
  }

  // 2. Чистые типы
  if (designType === "BOOLEAN") {
    return ["boolean"];
  }

  if (designType === "TEXT") {
    return ["string"];
  }

  if (designType === "INSTANCE_SWAP") {
    return ["swap instance"];
  }

  return null;
}

function normalizeProp(propName: string, propData: any): NormalizedProp {
  const rawPixsoName = String(propName);
  const pixsoName = cleanPropName(propName);
  const normalizedName = normalizePixsoName(pixsoName);
  const match = findDictionaryEntry(pixsoName, normalizedName, propData);
  const dict = match?.dict;
  const consistencyIssue = getNameTypeConsistencyStatus(rawPixsoName, propData);

  return {
    rawPixsoName,
    pixsoName,
    name: normalizedName,
    designName: dict?.designName || normalizedName,
    codeName: dict?.codeName || normalizedName,
    designType: propData?.type || "UNKNOWN",
    devType: dict?.type || "",
    description: dict?.description || "",
    category: dict?.category || "",
    values: getPropValues(propData),
    rawVariantOptions: Array.isArray(propData?.variantOptions)
    ? propData.variantOptions.map((v: any) => String(v))
    : null,
    defaultValue:
      propData?.defaultValue !== undefined ? propData.defaultValue : null,
    status: consistencyIssue?.status || match?.status || "UNKNOWN",
    suggestedName: match?.suggestedName || null,
    dictionaryIndex: match?.dictionaryIndex ?? null,
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
  const designType = String(prop.designType || "").toUpperCase();
  const devType = String(prop.devType || "").toLowerCase();

  if (designType === "BOOLEAN") return true;
  if (devType === "boolean") return true;

  if (prop.rawVariantOptions && prop.rawVariantOptions.length === 2) {
    const normalized = prop.rawVariantOptions
      .map((v) => String(v).toLowerCase())
      .sort();

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

  if (prop.rawVariantOptions && prop.rawVariantOptions.length) {
    return prop.rawVariantOptions.map(String);
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

    leftSection.appendChild(row, false);
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
      parent.appendChild(instance, false);
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

async function fillPurposeBlock(block: any, sourceNode: any) {
  const headerTitle =
    findNodeByName(block, "title") ||
    findNodeByName(block, "Header") ||
    findNodeByName(block, "text");

  if (headerTitle && headerTitle.type === "TEXT") {
    await loadTextNodeFontSafe(headerTitle);
    headerTitle.characters = "purpose";
  }

  const rightSection = findNodeByName(block, "rightSection");
  if (rightSection && typeof rightSection.remove === "function") {
    rightSection.remove();
  }

  const leftSection = findNodeByName(block, "leftSection");
  if (leftSection) {
    if ("layoutGrow" in leftSection) {
      leftSection.layoutGrow = 1;
    }
    if ("layoutAlign" in leftSection) {
      leftSection.layoutAlign = "STRETCH";
    }
  }

  const demoDescriptor =
    findNodeByName(block, "demoDescriptor") ||
    findNodeByName(block, "demoDescription") ||
    findNodeByName(block, "description");

  if (demoDescriptor && "visible" in demoDescriptor) {
    demoDescriptor.visible = false;
  }

  const descriptionText = pixso.createText();
  descriptionText.name = "descriptionText";
  await loadTextNodeFontSafe(descriptionText);
  descriptionText.characters = "Описание компонента";

  const header = findNodeByName(block, "header");
  const docBlock =
    findNodeByName(block, "doc/block") ||
    findNodeByName(block, "docBlock");

  if (header && header.parent && docBlock) {
    const parent = header.parent;
    parent.insertChild(parent.children.indexOf(docBlock), descriptionText);
  }

  const demoPlaceholder =
    findNodeByName(block, "demoPlaceholder") ||
    findNodeByName(block, "demo-placeholder");

  const instance = createDemoInstance(sourceNode);

  if (demoPlaceholder && demoPlaceholder.parent && instance) {
    const parent = demoPlaceholder.parent;

    if (typeof demoPlaceholder.remove === "function") {
      demoPlaceholder.remove();
    }

    if (typeof parent.appendChild === "function") {
      parent.appendChild(instance, false);
    }
  }
}

async function createDocHeader(): Promise<any | null> {
  const template = await pixso.importComponentByKeyAsync("4a262b5804508871c8115a589a1a05cd6beeb10d");

  if (!template || typeof template.createInstance !== "function") {
    return null;
  }

  const header = template.createInstance();

  header.name = "doc header";

  const pageTitle =
    findNodeByName(header, "pageTitle") ||
    findNodeByName(header, "title") ||
    findNodeByName(header, "text");

  if (pageTitle && pageTitle.type === "TEXT") {
    await loadTextNodeFontSafe(pageTitle);
    pageTitle.characters = "Общее описание компонента";
  }

  if ("layoutPositioning" in header) {
    header.layoutPositioning = "AUTO";
  }
  if ("layoutAlign" in header) {
    header.layoutAlign = "STRETCH";
  }
  if ("layoutGrow" in header) {
    header.layoutGrow = 0;
  }

  return header;
}

async function createDocNavigation(props: NormalizedProp[]): Promise<any | null> {
  const template = await pixso.importComponentByKeyAsync("a4b347581afa09e730175cdeb109d065aa8cd607");

  if (!template || typeof template.clone !== "function") {
    return null;
  }

  const navInstance = template.createInstance();
  const navigation =
    typeof navInstance.detachInstance === "function"
      ? navInstance.detachInstance()
      : navInstance;

  navigation.name = "doc navigation";

  const navList = findNodeByName(navigation, "navList");
  const navItemTemplate = navList ? findNodeByName(navList, "navItem") : null;

  if (!navList || !navItemTemplate || typeof navItemTemplate.clone !== "function") {
    return navigation;
  }

  // СНАЧАЛА делаем безопасную копию шаблона
  const navItemMaster = navItemTemplate.clone();

  const navItems = ["purpose", ...props.map((p) => p.designName || p.name)];

  // ПОТОМ очищаем список
  const oldChildren = [...navList.children];
  for (const child of oldChildren) {
    child.remove();
  }

  for (const itemName of navItems) {
    const navItem = navItemMaster.clone();
    navItem.name = `navItem / ${itemName}`;

    const textNode =
      findNodeByName(navItem, "text") ||
      findNodeByName(navItem, "title");

    if (textNode && textNode.type === "TEXT") {
      await loadTextNodeFontSafe(textNode);
      textNode.characters = itemName;
    }

    navList.appendChild(navItem, false);
  }

  if (typeof navItemMaster.remove === "function") {
    navItemMaster.remove();
  }

  if ("layoutPositioning" in navigation) {
    navigation.layoutPositioning = "AUTO";
  }
  if ("layoutAlign" in navigation) {
    navigation.layoutAlign = "STRETCH";
  }
  if ("layoutGrow" in navigation) {
    navigation.layoutGrow = 0;
  }

  if (typeof navigation.resize === "function") {
    navigation.resize(1200, navigation.height);
  }

  return navigation;
}

async function generateDocumentation() {
  const startedAt = Date.now();
  try {
    if (!lastInspectResult) {
      pixso.notify("Сначала нажми Inspect component");
      return;
    }

    const KEYS = {
      contentBlock: "1b89b827e1c21ed50d3ff95fbef5c616836d9026",
      header: "4a262b5804508871c8115a589a1a05cd6beeb10d",
      navigation: "a4b347581afa09e730175cdeb109d065aa8cd607",
    };

    const templateComponent = await pixso.importComponentByKeyAsync(KEYS.contentBlock);
    if (!templateComponent) {
      pixso.notify('Не удалось загрузить шаблон из библиотеки');
      return;
    }
    const template = templateComponent;

    const pageFrame = pixso.createFrame();
    pageFrame.name = `Doc / ${lastInspectResult.component || "Component"}`;
    pageFrame.layoutMode = "VERTICAL";
    pageFrame.itemSpacing = 0;
    pageFrame.cornerRadius = 24;
    pageFrame.fills = [
      {
        type: "SOLID",
        color: { r: 1, g: 1, b: 1 },
      },
    ];
    pageFrame.paddingLeft = 0;
    pageFrame.paddingRight = 0;
    pageFrame.paddingTop = 0;
    pageFrame.paddingBottom = 0;

    if ("primaryAxisSizingMode" in pageFrame) {
      pageFrame.primaryAxisSizingMode = "AUTO";
    }
    if ("counterAxisSizingMode" in pageFrame) {
      pageFrame.counterAxisSizingMode = "FIXED";
    }

    if (typeof pageFrame.resize === "function") {
      pageFrame.resize(1280, 100);
    }

    const bodyFrame = pixso.createFrame();
    bodyFrame.name = "bodyFrame";
    bodyFrame.layoutMode = "VERTICAL";
    bodyFrame.itemSpacing = 40;
    bodyFrame.fills = [];
    bodyFrame.paddingLeft = 40;
    bodyFrame.paddingRight = 40;
    bodyFrame.paddingTop = 40;
    bodyFrame.paddingBottom = 40;

    if ("layoutAlign" in bodyFrame) {
      bodyFrame.layoutAlign = "STRETCH";
    }
    if ("layoutPositioning" in bodyFrame) {
      bodyFrame.layoutPositioning = "AUTO";
    }

    const docFrame = pixso.createFrame();
    docFrame.name = "doc frame";
    docFrame.layoutMode = "VERTICAL";
    docFrame.itemSpacing = 72;
    docFrame.fills = [];
    docFrame.layoutGrow = 1;
    docFrame.paddingLeft = 0;
    docFrame.paddingRight = 0;
    docFrame.paddingTop = 0;
    docFrame.paddingBottom = 0;

    if ("layoutPositioning" in docFrame) {
      docFrame.layoutPositioning = "AUTO";
    }
    if ("layoutAlign" in docFrame) {
      docFrame.layoutAlign = "STRETCH";
    }

    if (typeof docFrame.resize === "function") {
      docFrame.resize(1200, 100);
    }

    const header = await createDocHeader();
    const navigation = await createDocNavigation(lastInspectResult.props);

    if (header) {
      pageFrame.appendChild(header, false);
    }

    if (navigation) {
      bodyFrame.appendChild(navigation, false);
    }

    bodyFrame.appendChild(docFrame, false);
    pageFrame.appendChild(bodyFrame, false);

    let createdCount = 0;

    if (typeof template.createInstance !== "function") {
      pixso.notify('У шаблона "doc content block" нет createInstance()');
      return;
    }

    const purposeInstance = template.createInstance();
    const purposeBlock =
      typeof purposeInstance.detachInstance === "function"
        ? purposeInstance.detachInstance()
        : purposeInstance;

    purposeBlock.name = "section / purpose";
    purposeBlock.visible = true;

    docFrame.appendChild(purposeBlock, false);
    await fillPurposeBlock(purposeBlock, lastInspectedNode);

    for (const prop of lastInspectResult.props) {
      pixso.ui.postMessage({
        type: "progress",
        current: createdCount + 1,
        total: lastInspectResult.props.length
      });

      const blockInstance = template.createInstance();
      const block = typeof blockInstance.detachInstance === "function"
        ? blockInstance.detachInstance()
        : blockInstance;
      block.name = `prop / ${prop.designName || prop.name}`;
      block.visible = true;

      docFrame.appendChild(block, false);

      await fillPropBlock(block, prop, lastInspectedNode);

      createdCount += 1;
    }

    pixso.currentPage.appendChild(pageFrame, false);

    const nodeX = lastInspectedNode?.x || 0;
    const nodeY = lastInspectedNode?.y || 0;
    pageFrame.x = nodeX;
    pageFrame.y = nodeY + (lastInspectedNode?.height || 0) + 500;

    if ("selection" in pixso.currentPage) {
      pixso.currentPage.selection = [pageFrame];
      pixso.viewport.scrollAndZoomIntoView([pageFrame]);
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

async function generateFullDocumentation() {
  try {
    if (!lastInspectResult) {
      pixso.notify("Сначала нажми Inspect component");
      return;
    }

    const componentName = lastInspectResult.component || "Component";

    const KEYS = {
      contentBlock: "1b89b827e1c21ed50d3ff95fbef5c616836d9026",
    };

    const templateComponent = await pixso.importComponentByKeyAsync(KEYS.contentBlock);
    if (!templateComponent) {
      pixso.notify("Не удалось загрузить шаблон");
      return;
    }

    // 1. Docs по пропам (существующая логика)
    await generateDocumentation();

    // 2. How to use
    const howToUseFrame = pixso.createFrame();
    howToUseFrame.name = `How to use / ${componentName}`;
    howToUseFrame.layoutMode = "VERTICAL";
    howToUseFrame.itemSpacing = 0;
    howToUseFrame.cornerRadius = 24;
    howToUseFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    howToUseFrame.paddingLeft = 0;
    howToUseFrame.paddingRight = 0;
    howToUseFrame.paddingTop = 0;
    howToUseFrame.paddingBottom = 0;
    if ("primaryAxisSizingMode" in howToUseFrame) howToUseFrame.primaryAxisSizingMode = "AUTO";
    if ("counterAxisSizingMode" in howToUseFrame) howToUseFrame.counterAxisSizingMode = "FIXED";
    if (typeof howToUseFrame.resize === "function") howToUseFrame.resize(1280, 100);

    const howToUseHeader = await createDocHeader();
    if (howToUseHeader) {
      const pageTitle =
        findNodeByName(howToUseHeader, "pageTitle") ||
        findNodeByName(howToUseHeader, "title") ||
        findNodeByName(howToUseHeader, "text");
      if (pageTitle && pageTitle.type === "TEXT") {
        await loadTextNodeFontSafe(pageTitle);
        pageTitle.characters = "How to use";
      }
      howToUseFrame.appendChild(howToUseHeader, false);
    }

    const howToUseBody = pixso.createFrame();
    howToUseBody.name = "bodyFrame";
    howToUseBody.layoutMode = "VERTICAL";
    howToUseBody.itemSpacing = 40;
    howToUseBody.fills = [];
    howToUseBody.paddingLeft = 40;
    howToUseBody.paddingRight = 40;
    howToUseBody.paddingTop = 40;
    howToUseBody.paddingBottom = 40;
    if ("layoutAlign" in howToUseBody) howToUseBody.layoutAlign = "STRETCH";
    if ("layoutPositioning" in howToUseBody) howToUseBody.layoutPositioning = "AUTO";

    const howToUseNav = await createDocNavigation(lastInspectResult.props);
    if (howToUseNav) {
      howToUseBody.appendChild(howToUseNav, false);
    }

    const howToUseBlock = templateComponent.createInstance();
    howToUseBlock.name = "doc content block";
    howToUseBody.appendChild(howToUseBlock, false);

    howToUseFrame.appendChild(howToUseBody, false);
    pixso.currentPage.appendChild(howToUseFrame, false);

    // 3. Dark mode
    const darkModeFrame = pixso.createFrame();
    darkModeFrame.name = `Dark mode / ${componentName}`;
    darkModeFrame.layoutMode = "VERTICAL";
    darkModeFrame.itemSpacing = 0;
    darkModeFrame.cornerRadius = 24;
    darkModeFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    darkModeFrame.paddingLeft = 0;
    darkModeFrame.paddingRight = 0;
    darkModeFrame.paddingTop = 0;
    darkModeFrame.paddingBottom = 0;
    if ("primaryAxisSizingMode" in darkModeFrame) darkModeFrame.primaryAxisSizingMode = "AUTO";
    if ("counterAxisSizingMode" in darkModeFrame) darkModeFrame.counterAxisSizingMode = "FIXED";
    if (typeof darkModeFrame.resize === "function") darkModeFrame.resize(1280, 100);

    const darkModeHeader = await createDocHeader();
    if (darkModeHeader) {
      const pageTitle =
        findNodeByName(darkModeHeader, "pageTitle") ||
        findNodeByName(darkModeHeader, "title") ||
        findNodeByName(darkModeHeader, "text");
      if (pageTitle && pageTitle.type === "TEXT") {
        await loadTextNodeFontSafe(pageTitle);
        pageTitle.characters = "Dark mode";
      }
      darkModeFrame.appendChild(darkModeHeader, false);
    }

    const darkModeBody = pixso.createFrame();
    darkModeBody.name = "bodyFrame";
    darkModeBody.layoutMode = "VERTICAL";
    darkModeBody.itemSpacing = 40;
    darkModeBody.fills = [];
    darkModeBody.paddingLeft = 40;
    darkModeBody.paddingRight = 40;
    darkModeBody.paddingTop = 40;
    darkModeBody.paddingBottom = 40;
    if ("layoutAlign" in darkModeBody) darkModeBody.layoutAlign = "STRETCH";
    if ("layoutPositioning" in darkModeBody) darkModeBody.layoutPositioning = "AUTO";

    const darkModeBlock = templateComponent.createInstance();
    darkModeBlock.name = "doc content block";
    darkModeBody.appendChild(darkModeBlock, false);

    darkModeFrame.appendChild(darkModeBody, false);
    pixso.currentPage.appendChild(darkModeFrame, false);

    // Позиционирование: 500px ниже компонента, слева направо с отступом 150px
    const baseX = lastInspectedNode?.x || 0;
    const baseY = (lastInspectedNode?.y || 0) + (lastInspectedNode?.height || 0) + 500;
    const gap = 150;
    const frameWidth = 1280;

    // Найти props doc фрейм (он уже создан generateDocumentation)
    const propsDocFrame = pixso.currentPage.children.find(
      (n: any) => n.name === `Doc / ${componentName}`
    ) as any;

    if (propsDocFrame) {
      propsDocFrame.x = baseX;
      propsDocFrame.y = baseY;
    }

    howToUseFrame.x = baseX + frameWidth + gap;
    howToUseFrame.y = baseY;

    darkModeFrame.x = baseX + (frameWidth + gap) * 2;
    darkModeFrame.y = baseY;

    const frames = [propsDocFrame, howToUseFrame, darkModeFrame].filter(Boolean);
    if ("selection" in pixso.currentPage) {
      pixso.currentPage.selection = frames;
    }
    pixso.viewport.scrollAndZoomIntoView(frames);

    pixso.notify(`Полная документация создана: ${componentName}`);
  } catch (error) {
    console.error(error);
    pixso.notify(`Ошибка: ${String(error)}`);
  } finally {
    pixso.ui.postMessage({ type: "generation-finished" });
  }
}

pixso.ui.onmessage = async (msg) => {
  if (msg.type === "inspect") {
    inspectSelectedNode();
    return;
  }

  if (msg.type === "get-key") {
    const node = pixso.currentPage.selection[0] as any;
    if (node?.key) {
      pixso.ui.postMessage({ type: "key-result", key: node.key });
    } else {
      pixso.notify("Выбери компонент из библиотеки");
    }
    return;
  }

  if (msg.type === "generate-documentation") {
    await generateDocumentation();
    return;
  }

  if (msg.type === "generate-full-documentation") {
    await generateFullDocumentation();
    return;
  }
};
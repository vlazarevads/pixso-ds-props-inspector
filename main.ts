import { propsDictionary } from "./data/propsDictionary";

pixso.showUI(__html__, { width: 720, height: 520 });

function cleanPropName(name: string): string {
  return String(name).split("#")[0].trim();
}

function normalizePixsoName(name: string): string {
  const cleaned = cleanPropName(name);

  if (cleaned.startsWith("🔄 ")) {
    return cleaned.replace("🔄 ", "").trim();
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

function normalizeProp(propName: string, propData: any) {
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

  pixso.ui.postMessage({
    type: "result",
    data: {
      component: node.name || null,
      type: node.type || null,
      description: node.description || "",
      props,
      validation,
    },
  });
}

pixso.ui.onmessage = (msg) => {
  if (msg.type === "inspect") {
    inspectSelectedNode();
  }
};
function createSlotVisibilityProp(
  name: string,
  visibilityDescription: string,
  slotDescription: string
) {
  return {
    designName: name,
    codeName: name,
    variants: {
      visibility: {
        designName: name,
        codeName: name,
        type: "ReactNode",
        description: visibilityDescription,
        category: "visibility",
      },
      slot: {
        designName: `🔄 ${name}`,
        codeName: name,
        type: "ReactNode",
        description: slotDescription,
        category: "slot",
      },
    },
  };
}

export const propsDictionary = {
  variant: {
    designName: "variant",
    codeName: "variant",
    type: "enum",
    description:
      "Определяет функциональное поведение компонента, предлагая предустановленные варианты отображения и логики",
    category: "component",
  },

  mode: {
    designName: "mode",
    codeName: "mode",
    type: "enum",
    description:
      "Определяет режим отображения компонента, задавая его визуальное состояние",
    category: "component",
  },

  size: {
    designName: "size",
    codeName: "size",
    type: "enum",
    description: "Размер компонента",
    category: "component",
  },

  padding: {
    designName: "padding",
    codeName: "padding",
    type: "enum",
    description: "Внутренние отступы компонента",
    category: "component",
  },

  orientation: {
    designName: "orientation",
    codeName: "orientation",
    type: "enum",
    description: "Ориентация компонента",
    category: "component",
  },

  state: {
    designName: "state",
    codeName: "state",
    type: "enum",
    description: "Состояние компонента",
    category: "component",
  },

  loading: {
    designName: "loading",
    codeName: "loading",
    type: "boolean",
    description: "Состояние загрузки",
    category: "component",
  },

  disabled: {
    designName: "disabled",
    codeName: "disabled",
    type: "boolean",
    description: "Недоступное состояние",
    category: "component",
  },

  readonly: {
    designName: "readonly",
    codeName: "readonly",
    type: "boolean",
    description: "Доступен только для чтения",
    category: "component",
  },

  validationStatus: {
    designName: "validationStatus",
    codeName: "validationStatus",
    type: "enum",
    description: "Статус валидации компонента",
    category: "component",
  },

  interactive: {
    designName: "interactive",
    codeName: "interactive",
    type: "boolean",
    description: "Включает/выключает интерактивный режим элемента",
    category: "component",
  },

  selected: {
    designName: "selected",
    codeName: "selected",
    type: "boolean",
    description: "Компонент выбран/не выбран",
    category: "component",
  },

  title: {
    designName: "✏️ title",
    codeName: "title",
    type: "string",
    description: "Заголовок",
    category: "content",
  },

  text: {
    designName: "✏️ text",
    codeName: "text",
    type: "string",
    description: "Текстовый контент",
    category: "content",
  },

  description: {
    designName: "✏️ description",
    codeName: "description",
    type: "string",
    description: "Дополнительный текст",
    category: "content",
  },

  value: {
    designName: "value",
    codeName: "value",
    type: "string",
    description: "Значение компонента",
    category: "content",
  },

  children: createSlotVisibilityProp(
    "children",
    "Отображение вложенного контента",
    "Вложенный элемент компонента"
  ),

  content: createSlotVisibilityProp(
    "content",
    "Отображение контента",
    "Контент компонента"
  ),

  contentBefore: createSlotVisibilityProp(
    "contentBefore",
    "Отображение контента перед основным содержимым",
    "Контент перед основным содержимым"
  ),

  contentAfter: createSlotVisibilityProp(
    "contentAfter",
    "Отображение контента после основного содержимого",
    "Контент после основного содержимого"
  ),

  contentCentered: createSlotVisibilityProp(
    "contentCentered",
    "Отображение контента по центру",
    "Контент по центру"
  ),

  contentLeft: createSlotVisibilityProp(
    "contentLeft",
    "Отображение контента слева",
    "Контент слева"
  ),

  contentRight: createSlotVisibilityProp(
    "contentRight",
    "Отображение контента справа",
    "Контент справа"
  ),

  contentBottom: createSlotVisibilityProp(
    "contentBottom",
    "Отображение контента снизу",
    "Контент снизу"
  ),

  contentTop: createSlotVisibilityProp(
    "contentTop",
    "Отображение контента сверху",
    "Контент сверху"
  ),

  iconBefore: createSlotVisibilityProp(
    "iconBefore",
    "Отображение иконки перед контентом",
    "Иконка перед контентом"
  ),

  iconAfter: createSlotVisibilityProp(
    "iconAfter",
    "Отображение иконки после контента",
    "Иконка после контента"
  ),

  elementBefore: createSlotVisibilityProp(
    "elementBefore",
    "Отображение элемента перед основным контентом",
    "Элемент перед основным контентом"
  ),

  elementAfter: createSlotVisibilityProp(
    "elementAfter",
    "Отображение элемента после основного контента",
    "Элемент после основного контента"
  ),

  elementTop: createSlotVisibilityProp(
    "elementTop",
    "Отображение элемента сверху",
    "Элемент сверху"
  ),

  elementBottom: createSlotVisibilityProp(
    "elementBottom",
    "Отображение элемента снизу",
    "Элемент снизу"
  ),

  elementRight: createSlotVisibilityProp(
    "elementRight",
    "Отображение элемента справа",
    "Элемент справа"
  ),

  elementLeft: createSlotVisibilityProp(
    "elementLeft",
    "Отображение элемента слева",
    "Элемент слева"
  ),

  elementCentered: createSlotVisibilityProp(
    "elementCentered",
    "Отображение элемента по центру",
    "Элемент по центру"
  ),

  image: {
    designName: "image",
    codeName: "image",
    type: "boolean",
    description: "Отображение изображения/иллюстрации",
    category: "visibility",
  },

  actions: {
    designName: "action(s)",
    codeName: "actions",
    type: "boolean",
    description: "Управляет отображением дополнительных действий",
    category: "visibility",
  },

  notification: {
    designName: "notification",
    codeName: "notification",
    type: "string",
    description: "Отображение уведомления внутри компонента",
    category: "component",
  },

  draggable: {
    designName: "draggable",
    codeName: "draggable",
    type: "boolean",
    description: "Включает возможность перетаскивания элемента",
    category: "component",
  },

  resizable: {
    designName: "resizable",
    codeName: "resizable",
    type: "boolean",
    description: "Включает возможность изменения размера компонента",
    category: "component",
  },

  closable: {
    designName: "closable",
    codeName: "closable",
    type: "boolean",
    description: "Включает возможность закрытия элемента",
    category: "component",
  },

  placeholder: {
    designName: "placeholder",
    codeName: "placeholder",
    type: "boolean",
    description: "Отображает placeholder или заполненное поле",
    category: "component",
  },

  truncateText: {
    designName: "truncateText",
    codeName: "truncateText",
    type: "boolean",
    description: "Обрезка текста при превышении ширины",
    category: "dev",
  },
} as const;
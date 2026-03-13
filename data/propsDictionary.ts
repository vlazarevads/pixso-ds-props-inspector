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

  children: {
    designName: "children",
    codeName: "children",
    type: "ReactNode",
    description: "Вложенный элемент компонента",
    category: "slot",
  },

  contentBefore: {
    designName: "🔄 contentBefore",
    codeName: "contentBefore",
    type: "ReactNode",
    description: "Слот для размещения дополнительного контента перед основным",
    category: "slot",
  },

  contentAfter: {
    designName: "🔄 contentAfter",
    codeName: "contentAfter",
    type: "ReactNode",
    description: "Слот для размещения дополнительного контента после основного",
    category: "slot",
  },

  contentTop: {
    designName: "🔄 contentTop",
    codeName: "contentTop",
    type: "ReactNode",
    description: "Слот для размещения дополнительного контента сверху",
    category: "slot",
  },

  contentBottom: {
    designName: "🔄 contentBottom",
    codeName: "contentBottom",
    type: "ReactNode",
    description: "Слот для размещения дополнительного контента снизу",
    category: "slot",
  },

  contentRight: {
    designName: "🔄 contentRight",
    codeName: "contentRight",
    type: "ReactNode",
    description: "Слот для размещения дополнительного контента справа",
    category: "slot",
  },

  contentLeft: {
    designName: "🔄 contentLeft",
    codeName: "contentLeft",
    type: "ReactNode",
    description: "Слот для размещения дополнительного контента слева",
    category: "slot",
  },

  contentCentered: {
    designName: "🔄 contentCentered",
    codeName: "contentCentered",
    type: "ReactNode",
    description: "Слот для размещения дополнительного контента по центру",
    category: "slot",
  },

  IconBefore: {
    designName: "iconBefore",
    codeName: "iconBefore",
    type: "boolean",
    description: "Отображение иконки перед контентом",
    category: "visibility",
  },

  iconBefore: {
    designName: "🔄 iconBefore",
    codeName: "iconBefore",
    type: "ReactNode",
    description: "Иконка перед контентом",
    category: "slot",
  },

  IconAfter: {
    designName: "iconAfter",
    codeName: "iconAfter",
    type: "boolean",
    description: "Отображение иконки после контента",
    category: "visibility",
  },

  iconAfter: {
    designName: "🔄 iconAfter",
    codeName: "iconAfter",
    type: "ReactNode",
    description: "Иконка после контента",
    category: "slot",
  },

  elementBefore: {
    designName: "🔄 elementBefore",
    codeName: "elementBefore",
    type: "ReactNode",
    description: "Одиночный элемент перед основным контентом",
    category: "slot",
  },

  elementAfter: {
    designName: "🔄 elementAfter",
    codeName: "elementAfter",
    type: "ReactNode",
    description: "Одиночный элемент после основного контента",
    category: "slot",
  },

  elementTop: {
    designName: "🔄 elementTop",
    codeName: "elementTop",
    type: "ReactNode",
    description: "Одиночный элемент сверху",
    category: "slot",
  },

  elementBottom: {
    designName: "🔄 elementBottom",
    codeName: "elementBottom",
    type: "ReactNode",
    description: "Одиночный элемент снизу",
    category: "slot",
  },

  elementRight: {
    designName: "🔄 elementRight",
    codeName: "elementRight",
    type: "ReactNode",
    description: "Одиночный элемент справа",
    category: "slot",
  },

  elementLeft: {
    designName: "🔄 elementLeft",
    codeName: "elementLeft",
    type: "ReactNode",
    description: "Одиночный элемент слева",
    category: "slot",
  },

  elementCentered: {
    designName: "🔄 elementCentered",
    codeName: "elementCentered",
    type: "ReactNode",
    description: "Одиночный элемент по центру",
    category: "slot",
  },

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
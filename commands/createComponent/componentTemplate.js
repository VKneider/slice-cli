export default function componentTemplate(componentName, props) {
  // Generar la lista de getters y setters para las props
  const propGettersSetters = props.map(prop => `
  get ${prop}() {
      return this._${prop};
  }

  set ${prop}(value) {
      this._${prop} = value;
  }
  `).join('\n');

  return `export default class ${componentName} extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);

    slice.controller.setComponentProps(this, props);
    this.debuggerProps = [${props.map(prop => `"${prop}"`).join(',')}];
  }

  init() {}

  ${propGettersSetters}
}

customElements.define("slice-${componentName.toLowerCase()}", ${componentName});
`;
}


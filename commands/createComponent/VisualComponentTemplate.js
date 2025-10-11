export default class componentTemplates{

  static visual(componentName){
    return `export default class ${componentName} extends HTMLElement {

  static props = {
    // Define your component props here
    // Example: 
    /*
    "value": { 
         type: 'string', 
         default: 'Button', 
         required: false 
      },
    */
  }

  constructor(props) {
    super();
    slice.attachTemplate(this);
    slice.controller.setComponentProps(this, props);
  }

  init() {
    // Component initialization logic (can be async)
  }

  update() {
    // Component update logic (can be async)
  }

  // Add your custom methods here
}

customElements.define("slice-${componentName.toLowerCase()}", ${componentName});
`;
  }

  static service(componentName) {
    return `export default class ${componentName} {
  constructor(props) {
    // Initialize service with props
    this.props = props || {};
  }

  init() {
    // Service initialization logic (can be async)
  }

  // Add your service methods here
}
`;
  }
}


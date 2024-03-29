import CustomStylesManager from "./CustomStylesManager/CustomStylesManager.js"
import ThemeManager from "./ThemeManager/ThemeManager.js"

export default class StylesManager {
    constructor() {
      this.componentStyles = document.createElement("style");
      this.componentStyles.id = "slice-component-styles";
      document.head.appendChild(this.componentStyles);
      
      this.customStylesManager = new CustomStylesManager();
      this.themeManager = new ThemeManager();
    }  

    handleInstanceStyles(instance, props) {
      if(props.customCSS){
        this.customStylesManager.proccess(instance, props); 
      }
    }

    setTheme(themeName){
      this.themeManager.applyTheme(themeName);
    }

    //add a method that will add css as text to the componentStyles element
    appendComponentStyles(cssText) {
      this.componentStyles.appendChild(document.createTextNode(cssText));
    }

    registerComponentStyles(componentName, cssText) {
      slice.controller.requestedStyles.add(componentName);
      this.appendComponentStyles(cssText);
    }




  }
  

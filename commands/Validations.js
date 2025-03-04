export default class Validations{
    constructor(){}

    static isValidComponentName(componentName) {
        // Expresión regular para verificar si el nombre contiene caracteres especiales
        const regex = /^[a-zA-Z][a-zA-Z0-9]*$/;
        return regex.test(componentName);
    }

    static isValidCategory(category){
        const categoryVariations = {
            'Service': ['service', 'servicio', 'serv', 's'],
            'Visual': ['visual', 'vis', 'v'],
            'Structural': ['structural', 'estructural', 'est', 'st']
        };
 
        let categoryIsValid = false;
        Object.keys(categoryVariations).forEach(validCategory => {
            if (categoryVariations[validCategory].includes(category.toLowerCase())) {
                category = validCategory
                categoryIsValid = true;
            }
        });

        return ({isValid: categoryIsValid, category: category})
    }


}
export default class Print{
    constructor(){}

   static error(message) {
        console.error('\x1b[31m', `❌ Error: ${message}`, '\x1b[0m');
    }
    
    static success(message) {
        console.log('\x1b[32m', `✅ Success: ${message}`, '\x1b[0m');
    }
    
}
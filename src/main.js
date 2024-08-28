// main.js
import Logger from './Logger';
import plugin from '../plugin.json';



const fs = acode.require("fs");
const fileList = acode.require("fileList");

const {
 editor } = editorManager;



import axios from "axios"

// Load the full build.
var _ = require('lodash');

let readerModuleKeys = Object.keys(_);

for (const [key, value] of Object.entries(readerModuleKeys)) {
 console.log(`teste : ${key}: ${value}`);
}




class NpmIntellisense {
 constructor() {
  this.dependencies = [];
  this.methodsAndFunctions = {};//armazenar metodos e funcoes dos modulos
  this.existingModules = []; // Armazenar os módulos importados/requeridos
  this.init();
  this.checkForUpdates();

  // Bind the context of 'this' to the method
  this.npmCompletions.getCompletions = this.npmCompletions.getCompletions.bind(this);
 }

 // Fetch the path of the package.json file
 async getPackagePath() {
  try {
   const list = await fileList();
   const packageFile = list.find((item) => item.name === "package.json");

   console.log('packageFile', packageFile);


   if (!packageFile || !packageFile.url) {
    throw new Error("The package.json file was not found.");
   }

   return packageFile.url;
  } catch (error) {
   Logger.error('Error fetching package.json path', { error });
   throw error; // Re-throw the error to maintain the original behavior
  }
 }



 // Remover duplicatas e filtrar módulos inválidos
 filterValidModules(modules) {
  const uniqueModules = Array.from(new Set(modules)); // Remove duplicatas
  return uniqueModules.filter(module => {
   // Excluir módulos que começam com './', '../', ou são arquivos JSON, etc.
   return !module.startsWith('./') && !module.startsWith('../') && !module.endsWith('.json');
  });
 }

 // Initialize the plugin

 async init() {
  window.toast('Plugin Inizializado...');
  const { commands } = editorManager.editor;

  this.loadAllCommands();

  // Comando para limpar cache
  commands.addCommand({
   name: 'reset-cache',
   bindKey: { win: 'Ctrl-Shift-R', mac: 'Command-Shift-R' },
   exec: () => {
    console.log('Resetando cache...');
    window.toast('Resetando cache...');
    localStorage.removeItem('npmIntellisenseCache-dependencies');
    localStorage.removeItem('npmIntellisenseCache-hash');
   },
  });

  // Comando para limpar dados
  commands.addCommand({
   name: 'clear-data',
   bindKey: { win: 'Ctrl-Shift-C', mac: 'Command-Shift-C' },
   exec: () => {
    console.log('Limpando dados...');
    window.toast('Limpando dados...');
    this.dependencies = [];
    this.methodsAndFunctions = {};
    localStorage.removeItem('npmIntellisenseCache-dependencies');
    localStorage.removeItem('npmIntellisenseCache-hash');
   },
  });

  try {
   await this.loadDependencies();
   await this.analyzeCurrentFile(); // Analisar o arquivo atual para capturar imports e requires existentes
   editor.completers.unshift(this.npmCompletions);

   const foundModules = this.filterValidModules(this.existingModules);


   this.foundModules = foundModules;

   console.log('foundModules',
    foundModules);

   // Agora você pode continuar a processar os módulos válidos
   foundModules.forEach(module => {
    this.methodsAndFunctions[module] = this.getMethodsAndFunctionsForModule(module);
   });


   // Escuta o evento de troca de arquivo e analisa o novo arquivo
   editorManager.on("switch-file", async () => {
    await this.analyzeCurrentFile();
   });

   Logger.info('Methods and Functions:', this.methodsAndFunctions);
  } catch (error) {
   Logger.error('Error initializing NpmIntellisense', { error });
  }
 }

 loadAllCommands() {
  editor.commands.addCommands([{
   name: " NpmIntellisense : Roni",
   description: "Seu Roni",
   exec: () => {
    console.log('Limpando dados...');
    window.toast('Limpando dados...');
    this.dependencies = [];
    this.methodsAndFunctions = {};
    localStorage.removeItem('npmIntellisenseCache-dependencies');
    localStorage.removeItem('npmIntellisenseCache-hash');
   },
  }]);
 }

 unloadAllCommands() {
  editor.commands.removeCommand(" NpmIntellisense : Roni");
 };

 

 // Para obter métodos e funções de um módulo
 getMethodsAndFunctionsForModule(module) {
  try {
   const moduleObject = acode.requie(module);
   
   

   if (!moduleObject) {
    Logger.warn(`Module "${module}" could not be loaded.`);
    return [];
   }

   const resolvedModule = moduleObject.default || moduleObject;

   // Função auxiliar para extrair funções de um objeto
   const extractFunctions = (obj) => {
    return Object.keys(obj).filter(key => typeof obj[key] === 'function');
   };

   let methodsAndFunctions = extractFunctions(resolvedModule);

   // Verifica se há propriedades do tipo "object" e extrai funções delas
   Object.keys(resolvedModule).forEach(key => {
    if (typeof resolvedModule[key] === 'object' && resolvedModule[key] !== null) {
     methodsAndFunctions = methodsAndFunctions.concat(extractFunctions(resolvedModule[key]));
    }
   });

   Logger.info(`Methods and functions found in module "${module}":`, methodsAndFunctions);
   return methodsAndFunctions;
  } catch (error) {
   Logger.error(`Error loading module "${module}":`, error);
   return [];
  }
 }


 // Analyze the current file to find existing imports and requires
 async analyzeCurrentFile() {
  try {
   const currentFileContent = await this.getCurrentFileContent();
   const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/g;
   const requireRegex = /require\(['"](.*)['"]\)/g;

   let match;
   while ((match = importRegex.exec(currentFileContent)) !== null) {
    this.existingModules.push(match[1]);
   }

   while ((match = requireRegex.exec(currentFileContent)) !== null) {
    this.existingModules.push(match[1]);
   }


   // remover antes do build
   console.log('Found modules:>', this.existingModules);


  } catch (error) {
   console.error('Error analyzing current file:', error);
  }
 }


 // Fetch the content of the current file opened in the editor
 async getCurrentFileContent() {
  const activeFile = editorManager.activeFile;


  if (!editorManager.activeFile.uri) return;


  const currentFileRead = await
   fs(activeFile.uri).readFile('utf-8');


  // remover antes do build
  console.log('currentFileRead', currentFileRead);

  return currentFileRead;
 }

 // Load dependencies and cache them
 async loadDependencies() {
  try {
   const packagePath = await this.getPackagePath();
   const packageJsonContent = await fs(packagePath).readFile('utf-8');
   const currentHash = this.hash(packageJsonContent);

   const cachedHash = localStorage.getItem('npmIntellisenseCache-hash');

   if (currentHash !== cachedHash) {
    const packageJson = JSON.parse(packageJsonContent);
    this.dependencies = Object.keys(packageJson.dependencies || {}).concat(
     Object.keys(packageJson.devDependencies || {})
    );
    localStorage.setItem('npmIntellisenseCache-dependencies', JSON.stringify(this.dependencies));
    localStorage.setItem('npmIntellisenseCache-hash', currentHash);
    console.log('Dependencies loaded and cached:', this.dependencies);
   } else {
    this.dependencies = JSON.parse(localStorage.getItem('npmIntellisenseCache-dependencies')) || [];
    console.log('Using cached dependencies');
   }
  } catch (error) {
   console.error('Error loading dependencies:', error);
  }
  window.toast('Atualizando Roni');
 }

 // Function to periodically check for updates in the package.json

 async checkForUpdates() {
  const interval = 60000; // Verifica a cada 60 segundos

  setInterval(async () => {
   try {
    const packagePath = await this.getPackagePath();
    const packageJsonContent = await fs(packagePath).readFile('utf-8');
    const currentHash = this.hash(packageJsonContent);

    const cachedHash = localStorage.getItem('npmIntellisenseCache-hash');

    if (currentHash !== cachedHash) {
     await this.loadDependencies();
     await this.analyzeCurrentFile(); // Reanalisa os módulos importados

     // Atualiza o cache do hash
     localStorage.setItem('npmIntellisenseCache-hash', currentHash);
     this.updateSuggestions(); // Atualiza as sugestões
    }
   } catch (error) {
    console.error('Error checking for updates:', error);
   }
  }, interval);
 }

 // Atualiza as sugestões de autocomplete
 updateSuggestions() {
  const foundModules = this.filterValidModules(this.existingModules);

  // Processa os módulos válidos e atualiza os métodos e funções
  foundModules.forEach(module => {
   this.methodsAndFunctions[module] = this.getMethodsAndFunctionsForModule(module);
  });
  console.log('atualizando', atualizando);
  Logger.info('Updated Methods and Functions:', this.methodsAndFunctions);
 }

 // Função para gerar um hash simples (por exemplo, MD5) do conteúdo do package.json
 hash(content) {
  return content.split('').reduce((a, b) => {
   a = ((a << 5) - a) + b.charCodeAt(0);
   return a & a; // Converte para 32 bits
  }, 0);
 }

 // Extract the current input from the editor line
 getCurrentInput(line, column) {
  let input = "";
  let i = column - 1;
  while (i >= 0 && /[a-zA-Z0-9/.+_-\s$@:]/.test(line[i])) {
   input = line[i] + input;
   i--;
  }
  return input;
 }

 // Provide autocomplete suggestions e methods and functions
 npmCompletions = {
  getCompletions(editor, session, pos, prefix, callback) {
   try {
    const currentLine = session.getLine(pos.row);
    const input = this.getCurrentInput(currentLine, pos.column);

    const suggestions = this.dependencies
     .filter((dep) => dep.startsWith(input))
     .map((dep) => ({
      caption: dep,
      value: dep,
      score: 1000,
      meta: "dependency",
     }));

    // Adiciona sugestões de métodos e funções
    const module = this.dependencies.find(dep => input.startsWith(dep));
    if (module && this.methodsAndFunctions[module]) {
     const methodSuggestions = this.methodsAndFunctions[module].map(method => ({
      caption: method,
      value: method,
      score: 900,
      meta: "method",
     }));
     suggestions.push(...methodSuggestions);
    }

    callback(null, suggestions);
   } catch (err) {
    callback(null, []);
    window.toast("NpmIntellisense Error: " + err.message, 3000);
    console.log(err.message);
   }
  }
 };

 // Destroy the plugin and remove the autocompleter
 async destroy() {
  window.toast('Plugin Destroido');
  this.unloadAllCommands();
  editorManager.editor.commands.removeCommand("NpmIntellisense");
  editor.completers = editor.completers.filter(
   (completer) => completer !== this.npmCompletions
  );
  console.log('Plugin destroyed');
 }


}

// Plugin initialization
if (window.acode) {
 const acodePlugin = new NpmIntellisense();

 acode.setPluginInit(plugin.id, async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
  if (!baseUrl.endsWith('/')) {
   baseUrl += '/';
  }
  acodePlugin.baseUrl = baseUrl;
  await acodePlugin.init($page, cacheFile, cacheFileUrl);
 });

 acode.setPluginUnmount(plugin.id, () => {
  acodePlugin.destroy();
 });
}
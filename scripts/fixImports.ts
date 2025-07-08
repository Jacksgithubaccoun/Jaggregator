// scripts/fixImports.ts
import { Project } from "ts-morph";
import path from "path";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

project.getSourceFiles().forEach((sourceFile) => {
  sourceFile.getImportDeclarations().forEach((imp) => {
    const moduleSpecifier = imp.getModuleSpecifierValue();

    // Only modify relative imports going outside src
    if (moduleSpecifier.startsWith("..")) {
      const newPath = path.relative(
        path.dirname(sourceFile.getFilePath()),
        path.resolve("src", path.basename(moduleSpecifier))
      );
      imp.setModuleSpecifier(newPath.startsWith(".") ? newPath : `./${newPath}`);
    }
  });
});

project.saveSync();

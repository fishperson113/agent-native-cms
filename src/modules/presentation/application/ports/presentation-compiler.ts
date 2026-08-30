export type CompiledPresentation = {
  code: string;
  warnings: string[];
};

export interface PresentationCompiler {
  compile(sourceCode: string): Promise<CompiledPresentation>;
}

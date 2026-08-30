export interface SlugGenerator {
  generate(input: string): string;
}

export class BasicSlugGenerator implements SlugGenerator {
  generate(input: string): string {
    return input
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120)
      .replace(/-+$/g, "");
  }
}

# Bundled Fonts

This directory contains bundled Gothic fonts for StageForge.

## Fonts Included

### Noto Sans CJK (Gothic Font Family)
- **Noto Sans JP** - Japanese Gothic font
- **Noto Sans SC** - Simplified Chinese Gothic font
- **Noto Sans TC** - Traditional Chinese Gothic font

These fonts are part of the Google Noto Fonts family, designed to support all languages with a harmonious look and feel.

## License

Noto Sans CJK fonts are licensed under the SIL Open Font License 1.1.
See: https://github.com/notofonts/noto-cjk

## Font Files

Due to their large size (typically 15-20MB per font), the actual font files should be downloaded during the build process or included in the distribution package.

For development, you can download them from:
- https://github.com/notofonts/noto-cjk/releases

## Usage

The fonts are loaded via `@font-face` declarations in `styles.css` and are available as:
- `font-family: 'Noto Sans JP'` for Japanese
- `font-family: 'Noto Sans SC'` for Simplified Chinese
- `font-family: 'Noto Sans TC'` for Traditional Chinese
- `font-family: 'Gothic'` as a generic fallback

The application automatically selects the appropriate font based on the selected language.

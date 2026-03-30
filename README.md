# Badge Generator - Générateur de badges 32mm pour presse Vevor

Ce script Node.js génère des PDF prêts à imprimer contenant des gabarits de badges 32mm pour les presses à badges Vevor.

## Installation

```bash
npm install
```

## Utilisation

```bash
node index.js <images...> [options]
```

### Arguments

- `<images...>` : Un ou plusieurs fichiers images (PNG, JPG, etc.) à utiliser comme fond des badges

### Options

| Option | Description | Valeur par défaut |
|--------|-------------|-------------------|
| `-o, --output <file>` | Fichier PDF de sortie | `badges.pdf` |
| `-c, --copies <number>` | Nombre de copies de chaque badge (0 = remplir la page) | `0` |
| `-s, --scale <number>` | Facteur d'échelle pour ajuster la taille de l'image (ex: 1.05 pour +5%) | `1.0` |
| `--no-guides` | Ne pas afficher les guides de découpe ni de pliage | - |
| `--no-cut-guides` | Ne pas afficher les guides de découpe (conserve les guides de pliage) | - |
| `--no-center-cross` | Ne pas afficher la croix de centrage | - |
| `--no-warning-text` | Ne pas afficher le texte d'avertissement dans la zone de pliage | - |

### Exemples

```bash
# Générer un PDF avec une seule image (remplit la page)
node index.js mon-logo.png

# Générer avec plusieurs images (remplit la page en alternant)
node index.js logo1.png logo2.jpg logo3.png

# Générer 5 copies de chaque badge
node index.js mon-logo.png -c 5

# Spécifier le fichier de sortie
node index.js mon-logo.png -o mes-badges.pdf

# Ajuster l'échelle de l'image (+5%)
node index.js mon-logo.png -s 1.05

# Combiner les options
node index.js logo1.png logo2.png -c 3 -o badges-event.pdf

# Sans guides de découpe ni de pliage (pour impression finale)
node index.js mon-logo.png --no-guides

# Uniquement les guides de pliage (sans guides de découpe)
node index.js mon-logo.png --no-cut-guides

# Sans la croix de centrage (conserve les autres guides)
node index.js mon-logo.png --no-center-cross

# Sans le texte d'avertissement dans la zone de pliage
node index.js mon-logo.png --no-warning-text
```

## Dimensions des badges

Le script utilise les dimensions standard pour les badges 32mm Vevor :

| Zone | Diamètre | Description |
|------|----------|-------------|
| Zone visible | 32mm | Partie visible du badge fini |
| Zone de pliage | 37mm | Zone de sécurité pour le design (éviter les éléments importants près du bord) |
| Zone de découpe | 44mm | Diamètre total du papier à découper |

## Structure du PDF généré

- **Pages de badges** : Les images sont disposées en grille sur des pages A4 (4 colonnes × 6 lignes = 24 badges par page)
- **Page de légende** : La dernière page contient une légende explicative et les instructions d'utilisation

## Marquages sur les gabarits

- **Ligne pointillée** (grise) : Ligne de découpe (44mm) - peut être désactivée avec `--no-cut-guides`
- **Ligne fine** (gris clair) : Zone de pliage/sécurité (37mm) - désactivée avec `--no-guides`
- **Ligne continue** (gris foncé) : Zone visible finale (32mm) - désactivée avec `--no-guides`
- **Croix centrale** : Centre du badge pour l'alignement - peut être désactivée avec `--no-center-cross`
- **Texte d'avertissement** (rouge, 35% d'opacité) : "• NE PAS MARQUER: SURFACE VIERGE •" suivant la courbure de la zone de pliage (en haut et en bas) - peut être désactivé avec `--no-warning-text`

Toutes ces options peuvent être combinées pour personnaliser l'affichage des guides selon vos besoins.

## Conseils d'impression

1. **Imprimez à 100%** : Ne pas mettre à l'échelle le PDF
2. **Papier recommandé** : Papier photo mat ou brillant 200-250g/m²
3. **Découpe** : Suivez la ligne pointillée extérieure
4. **Vérification** : Utilisez la croix centrale pour vérifier l'alignement dans la presse

## Formats d'images supportés

- PNG (recommandé pour les logos avec transparence)
- JPEG
- WebP
- TIFF
- GIF

## Dépendances

- [pdfkit](https://www.npmjs.com/package/pdfkit) : Génération de PDF
- [sharp](https://www.npmjs.com/package/sharp) : Traitement d'images
- [commander](https://www.npmjs.com/package/commander) : Interface ligne de commande


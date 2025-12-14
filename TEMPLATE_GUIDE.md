# PowerPoint Template Guide

This guide explains how to create PowerPoint presentations that work best with StageForge.

## Template Structure

### Recommended Layout
- **Slide Size**: 16:9 (1920x1080) or 4:3 (1024x768)
- **One slide = One act/scene**
- **Consistent backgrounds** for professional appearance

### Naming Convention
- File name becomes the program name in StageForge
- Use descriptive names: `SpringConcert2024.pptx`, `GraduationCeremony.pptx`
- Avoid special characters in file names

### Slide Content Guidelines

1. **Title Slide (Act 1)**
   - Program title
   - Event information
   - Date/venue

2. **Content Slides (Acts 2-N)**
   - Each slide represents one segment of your event
   - Use high-quality images
   - Minimal text for better readability from distance

3. **Final Slide**
   - Closing message
   - Credits
   - Thank you message

### Speaker Notes (Future Feature)
In future versions, speaker notes will be extracted as act descriptions. To prepare:
- Add detailed notes to each slide
- Include timing information
- Add cues for lighting/sound

## Best Practices

### Visual Design
✅ **Do:**
- Use high-contrast colors
- Large, readable fonts (minimum 24pt)
- Simple, clean layouts
- Professional images (1920x1080 or higher)

❌ **Don't:**
- Use too many animations (they won't convert)
- Add videos (not supported yet)
- Use very small text
- Overcrowd slides with content

### File Organization
- Keep all related PPTs in one folder
- Use version numbers in file names if iterating
- Test import before the event

### Testing
1. Import your PPT into StageForge
2. Load the program
3. Check all scenes in OBS
4. Verify image quality
5. Test scene transitions

## Example Program Structure

### School Concert Program
```
Slide 1: Welcome & Event Title
Slide 2: Opening Performance - Choir
Slide 3: Jazz Band Performance
Slide 4: Solo Performance - Piano
Slide 5: Dance Performance
Slide 6: Closing Performance - Orchestra
Slide 7: Thank You & Credits
```

### Graduation Ceremony
```
Slide 1: Welcome to Graduation 2024
Slide 2: National Anthem
Slide 3: Principal's Address
Slide 4: Valedictorian Speech
Slide 5: Diploma Presentation
Slide 6: Class Photo
Slide 7: Congratulations
```

## Conversion Notes

### LibreOffice Conversion
If LibreOffice is installed, slides will be converted to PNG images:
- Resolution: Based on slide size
- Format: PNG (lossless)
- Location: `data/slides/[program-id]/`

### Without LibreOffice
StageForge will create placeholder scenes that you can manually configure in OBS.

## Tips for Live Events

1. **Prepare in Advance**: Import and test all programs before the event
2. **Backup Plans**: Keep original PPT files accessible
3. **Run Through**: Do a complete run-through with actual timing
4. **Simplicity**: Simpler slides often work better for live events
5. **Contrast**: Ensure good contrast for projection

## Troubleshooting

**Problem**: Images look pixelated
**Solution**: Use higher resolution source images (1920x1080 minimum)

**Problem**: Colors look different in OBS
**Solution**: Use RGB color mode in PowerPoint, avoid CMYK

**Problem**: Text is hard to read
**Solution**: Increase font size, use high-contrast colors, add shadows/outlines

## Support

For issues or questions about template creation, please refer to the main README.md or open an issue on GitHub.

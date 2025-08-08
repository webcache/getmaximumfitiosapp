import * as FileSystem from 'expo-file-system';

export interface AchievementImageData {
  title: string;
  description: string;
  type: 'workout_complete' | 'personal_record' | 'achievement' | 'progress';
  color: string;
}

/**
 * Generate a simple SVG-based achievement image
 * This creates an SVG file that can be saved as an image
 */
export const generateAchievementSVG = async (data: AchievementImageData): Promise<string> => {
  const { title, description, type, color } = data;
  
  // Get appropriate emoji for the achievement type
  const getEmoji = () => {
    switch (type) {
      case 'workout_complete': return '🏋️‍♂️';
      case 'personal_record': return '🏆';
      case 'progress': return '📈';
      default: return '🎯';
    }
  };

  // Create SVG content
  const svgContent = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color}88;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="400" height="400" fill="url(#bgGradient)" rx="20"/>
      
      <!-- Content Container -->
      <g transform="translate(40, 60)">
        <!-- Icon/Emoji (we'll use a circle with text since SVG doesn't render emojis well) -->
        <circle cx="160" cy="60" r="30" fill="rgba(255,255,255,0.2)"/>
        <text x="160" y="70" text-anchor="middle" fill="white" font-size="24" font-family="Arial, sans-serif">
          ${getEmoji()}
        </text>
        
        <!-- Title -->
        <text x="160" y="130" text-anchor="middle" fill="white" font-size="24" font-weight="bold" font-family="Arial, sans-serif">
          <tspan x="160" dy="0">${title.slice(0, 20)}</tspan>
          ${title.length > 20 ? `<tspan x="160" dy="30">${title.slice(20, 40)}</tspan>` : ''}
        </text>
        
        <!-- Description -->
        <text x="160" y="200" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="16" font-family="Arial, sans-serif">
          <tspan x="160" dy="0">${description.slice(0, 30)}</tspan>
          ${description.length > 30 ? `<tspan x="160" dy="25">${description.slice(30, 60)}</tspan>` : ''}
          ${description.length > 60 ? `<tspan x="160" dy="25">${description.slice(60, 90)}</tspan>` : ''}
        </text>
        
        <!-- App Name -->
        <text x="160" y="300" text-anchor="middle" fill="white" font-size="18" font-weight="600" font-family="Arial, sans-serif">
          Maximum Fit
        </text>
        
        <!-- Decorative line -->
        <line x1="60" y1="280" x2="260" y2="280" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      </g>
    </svg>
  `;

  try {
    // Save SVG to temporary file
    const svgUri = `${FileSystem.documentDirectory}achievement_${Date.now()}.svg`;
    await FileSystem.writeAsStringAsync(svgUri, svgContent);
    return svgUri;
  } catch (error) {
    console.error('Error generating SVG:', error);
    throw error;
  }
};

/**
 * Generate a simple text-based image as HTML
 * This is a fallback when SVG isn't suitable
 */
export const generateAchievementHTML = async (data: AchievementImageData): Promise<string> => {
  const { title, description, type, color } = data;
  
  const getEmoji = () => {
    switch (type) {
      case 'workout_complete': return '🏋️‍♂️';
      case 'personal_record': return '🏆';
      case 'progress': return '📈';
      default: return '🎯';
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=400, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, ${color}, ${color}88);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
            padding: 40px;
          }
          .icon {
            font-size: 60px;
            margin-bottom: 30px;
            background: rgba(255,255,255,0.1);
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .title {
            font-size: 26px;
            font-weight: bold;
            margin-bottom: 20px;
            line-height: 1.3;
            max-width: 300px;
          }
          .description {
            font-size: 16px;
            margin-bottom: 40px;
            line-height: 1.5;
            opacity: 0.9;
            max-width: 280px;
          }
          .footer {
            font-size: 18px;
            font-weight: 600;
            margin-top: auto;
            border-top: 1px solid rgba(255,255,255,0.3);
            padding-top: 20px;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="icon">${getEmoji()}</div>
        <div class="title">${title}</div>
        <div class="description">${description}</div>
        <div class="footer">Maximum Fit</div>
      </body>
    </html>
  `;

  try {
    const htmlUri = `${FileSystem.documentDirectory}achievement_${Date.now()}.html`;
    await FileSystem.writeAsStringAsync(htmlUri, htmlContent);
    return htmlUri;
  } catch (error) {
    console.error('Error generating HTML:', error);
    throw error;
  }
};

import { Request, Response } from 'express';
import * as cheerio from 'cheerio';

interface ExtractedRecipe {
  title: string;
  ingredients: string;
  instructions: string;
  image?: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
}

const parseISO8601Duration = (duration: string): number => {
  if (!duration || typeof duration !== 'string') return 0;
  const regex = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
  const matches = duration.match(regex);
  if (!matches) return 0;
  
  const [,,,,, hours, minutes] = matches.map(m => parseInt(m) || 0);
  // Simple conversion to minutes for now
  return (hours * 60) + minutes;
};

const cleanText = (text: string): string => {
  if (!text) return '';
  // If it doesn't look like HTML, just trim it
  if (!text.includes('<') && !text.includes('&')) return text.trim();
  
  // Use cheerio to strip tags and decode entities
  const $ = cheerio.load(text);
  // Replace common block elements with newlines to preserve some structure if it's a raw block
  $('p, br, div, li').each((_, el) => {
    $(el).after('\n');
  });
  return $.text()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
};

export const fetchUrlPreview = async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch URL: ${response.statusText}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    let recipeData: any = null;

    // 1. Try JSON-LD Extraction
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '');
        const findRecipe = (obj: any): any => {
          if (!obj) return null;
          if (obj['@type'] === 'Recipe') return obj;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const result = findRecipe(item);
              if (result) return result;
            }
          }
          if (obj['@graph'] && Array.isArray(obj['@graph'])) {
            return findRecipe(obj['@graph']);
          }
          return null;
        };

        const recipeObj = findRecipe(json);
        if (recipeObj) {
          // Robust flattener for instructions (handles HowToStep, HowToSection, strings, etc.)
          const flattenInstructions = (val: any): string[] => {
            if (!val) return [];
            if (typeof val === 'string') return [val];
            if (Array.isArray(val)) {
              return val.flatMap(item => flattenInstructions(item));
            }
            if (val.text) return [val.text];
            if (val.itemListElement) return flattenInstructions(val.itemListElement);
            if (val.name && val['@type'] === 'HowToSection') {
              // Optionally include section name, but usually steps are enough
              return flattenInstructions(val.itemListElement);
            }
            return [];
          };

          const rawInstructions = flattenInstructions(recipeObj.recipeInstructions);
          const instructions = rawInstructions
            .map(step => cleanText(step))
            .filter(Boolean)
            .join('\n');

          // Flatten ingredients
          let rawIngredients: string[] = [];
          if (Array.isArray(recipeObj.recipeIngredient)) {
            rawIngredients = recipeObj.recipeIngredient;
          } else if (typeof recipeObj.recipeIngredient === 'string') {
            rawIngredients = [recipeObj.recipeIngredient];
          }
          const ingredients = rawIngredients
            .map(ing => cleanText(ing))
            .filter(Boolean)
            .join('\n');

          // Flatten image
          let image = '';
          if (Array.isArray(recipeObj.image)) {
            image = typeof recipeObj.image[0] === 'string' ? recipeObj.image[0] : recipeObj.image[0]?.url;
          } else if (typeof recipeObj.image === 'string') {
            image = recipeObj.image;
          } else if (recipeObj.image?.url) {
            image = recipeObj.image.url;
          }

          // Servings
          let servings = 0;
          if (recipeObj.recipeYield) {
            const yieldStr = Array.isArray(recipeObj.recipeYield) ? recipeObj.recipeYield[0] : recipeObj.recipeYield;
            servings = parseInt(yieldStr.toString().match(/\d+/)?.[0] || '0');
          }

          recipeData = {
            title: recipeObj.name || '',
            ingredients,
            instructions,
            image,
            description: recipeObj.description || '',
            prepTime: parseISO8601Duration(recipeObj.prepTime),
            cookTime: parseISO8601Duration(recipeObj.cookTime),
            servings
          };
          return false; // Break loop
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // 2. Heuristic Backfill/Extraction
    const heuristicData: any = {
      title: $('h1').first().text().trim() || $('title').text().trim() || $('meta[property="og:title"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
      description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
      ingredients: '',
      instructions: '',
      prepTime: 0,
      cookTime: 0,
      servings: 0
    };

    // Heuristic for time and servings
    const bodyText = $('body').text().toLowerCase();
    
    // Improved serving extraction
    const servingMatch = bodyText.match(/(?:serves|servings|yield)\s*[:\-]?\s*(\d+)/i);
    if (servingMatch) heuristicData.servings = parseInt(servingMatch[1]);

    // Improved time extraction
    const prepMatch = bodyText.match(/(?:prep|preparation)\s*(?:time)?\s*[:\-]?\s*(\d+)\s*(?:min|minute)/i);
    if (prepMatch) heuristicData.prepTime = parseInt(prepMatch[1]);

    const cookMatch = bodyText.match(/(?:cook|cooking)\s*(?:time)?\s*[:\-]?\s*(\d+)\s*(?:min|minute)/i);
    if (cookMatch) heuristicData.cookTime = parseInt(cookMatch[1]);

    // Find ingredients - prioritizing lists that use common imperial units (cup, oz, tsp, tbsp)
    // to avoid auto-converted metric-only lists often found in hidden SEO blocks
    const ingredientLists: { text: string, score: number }[] = [];
    
    $('*').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      // Look for containers or headers that mention ingredients
      return ($(el).is(':header') || $(el).hasClass('ingredients-title')) && 
             (text.includes('ingredient') || text.includes('what you need'));
    }).each((_, el) => {
      let list = $(el).nextAll('ul, ol').first();
      if (!list.length) {
        list = $(el).parent().nextAll('ul, ol').first();
      }
      
      if (list.length) {
        const items = list.find('li').map((_, li) => $(li).text().trim()).get();
        const listText = items.join('\n');
        
        // Score the list: +1 for every "imperial" marker, -1 for "metric only" markers if common in the region
        let score = 0;
        const imperialMarkers = ['cup', 'tsp', 'tbsp', 'oz', 'lb', 'inch', 'pound', 'ounce', 'teaspoon', 'tablespoon'];
        const metricOnlyMarkers = [' g ', ' ml ', 'kg', 'grams', 'milliliters'];
        
        imperialMarkers.forEach(m => { if (listText.toLowerCase().includes(m)) score += 2; });
        metricOnlyMarkers.forEach(m => { if (listText.toLowerCase().includes(m)) score -= 1; });
        
        ingredientLists.push({ text: listText, score });
      }
    });

    if (ingredientLists.length > 0) {
      // Sort by score and length to find the most "recipe-like" list
      ingredientLists.sort((a, b) => b.score - a.score || b.text.length - a.text.length);
      heuristicData.ingredients = ingredientLists[0].text;
    }

    // Find instructions by looking for lists or blocks near instruction keywords
    $('*').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      const isHeader = $(el).is(':header');
      return isHeader && (text.includes('instruction') || text.includes('direction') || text.includes('method') || text.includes('preparation'));
    }).each((_, el) => {
      let content = $(el).nextAll('ul, ol, div').first();
      if (content.is('ul, ol')) {
        heuristicData.instructions = content.find('li').map((_, li) => $(li).text().trim()).get().join('\n');
      } else if (content.length) {
        heuristicData.instructions = content.text().trim();
      }
      if (heuristicData.instructions) return false;
    });

    // 3. Merge Strategies
    // Determine which ingredient list is better (preferring original units like cups/tsp)
    let finalIngredients = recipeData?.ingredients || cleanText(heuristicData.ingredients);
    if (recipeData?.ingredients && heuristicData.ingredients) {
      const getImperialScore = (t: string) => (t.match(/cup|tsp|tbsp|oz|lb|inch|teaspoon|tablespoon/gi) || []).length;
      const heuristicIngredients = cleanText(heuristicData.ingredients);
      if (getImperialScore(heuristicIngredients) > getImperialScore(recipeData.ingredients) + 5) {
        // If the heuristic found significantly more "original" units than the JSON-LD, 
        // the JSON-LD might be a metric-converted SEO version.
        finalIngredients = heuristicIngredients;
      }
    }

    const finalRecipe: ExtractedRecipe = {
      title: cleanText(recipeData?.title || heuristicData.title),
      ingredients: finalIngredients,
      instructions: recipeData?.instructions || cleanText(heuristicData.instructions),
      image: recipeData?.image || heuristicData.image,
      description: cleanText(recipeData?.description || heuristicData.description),
      prepTime: recipeData?.prepTime || heuristicData.prepTime,
      cookTime: recipeData?.cookTime || heuristicData.cookTime,
      servings: recipeData?.servings || heuristicData.servings,
    };

    res.json({ html, extractedRecipe: finalRecipe.title ? finalRecipe : null });
  } catch (err: any) {
    console.error('Error fetching URL:', err);
    res.status(500).json({ error: 'Failed to fetch the provided URL.' });
  }
};

export const getCoordinatesByQuery = async (
  query: string
): Promise<{ lat: number; lon: number } | null> => {
  try {
    const trimmedQuery = query.trim();

    let params = new URLSearchParams({
      format: 'json',
      limit: '1',
      q: trimmedQuery,
    });

    let response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { 'Accept-Language': 'en' } }
    );

    let data = await response.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }

    const match = trimmedQuery.match(/^(\d{4,6}),?\s*(\w+)?$/);
    if (match) {
      const postalcode = match[1];
      const country = match[2] || ''; 
      if (!country) {
        throw new Error('Please add a country, e.g. "12557, Germany"');
      }

      params = new URLSearchParams({
        format: 'json',
        limit: '1',
        postalcode,
        country,
      });

      response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { 'Accept-Language': 'en' } }
      );

      data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    }

    throw new Error('City or postal code not found');
  } catch (error: any) {
    console.error('Geo error:', error);
    throw error;
  }
};

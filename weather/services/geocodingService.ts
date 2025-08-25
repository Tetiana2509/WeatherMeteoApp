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

export const getPlaceNameByCoordinates = async (
  lat: number,
  lon: number
): Promise<string> => {
  try {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(lat),
      lon: String(lon),
      zoom: '10',
      addressdetails: '1',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await response.json();

    const address = data?.address || {};
    const locality = address.city || address.town || address.village || address.hamlet || address.suburb || address.county;
    const country = address.country;
    if (locality && country) return `${locality}, ${country}`;
    if (data?.display_name) return data.display_name as string;
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch (err) {
    console.error('Reverse geo error:', err);
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
};

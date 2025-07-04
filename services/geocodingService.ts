export const getCoordinatesByQuery = async (
  query: string
): Promise<{ lat: number; lon: number } | null> => {
  try {
    const trimmedQuery = query.trim();

    // 🔁 Попытка №1 — обычный текстовый поиск
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

    // 🔁 Попытка №2 — если введён только индекс, попробовать как postalcode + country
    const match = trimmedQuery.match(/^(\d{4,6}),?\s*(\w+)?$/);
    if (match) {
      const postalcode = match[1];
      const country = match[2] || ''; // либо указана, либо нет
      if (!country) {
        throw new Error('Додайте країну, напр. "12557, Germany"');
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

    throw new Error('Місто або індекс не знайдено');
  } catch (error: any) {
    console.error('Geo error:', error);
    throw error;
  }
};

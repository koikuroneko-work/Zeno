import { FastifyInstance } from 'fastify';
import { nearbyPayloadSchema, nearbyResponseSchema } from 'shared';

export async function nearbyRoutes(app: FastifyInstance) {
  app.post('/nearby/affordable-options', async (request, reply) => {
    const parsed = nearbyPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Invalid payload', details: parsed.error.format() });
      return;
    }

    const { latitude, longitude, category } = parsed.data;

    // Mock nearby affordable options - in production, this would call a real places API
    const mockResults = [
      {
        id: 'mock-1',
        name: category === 'food' ? 'Budget Breakfast Cafe' : 'Value Mart',
        rating: 4.2,
        priceLevel: 1,
        distanceMeters: 350,
        openNow: true,
        address: '123 Main St',
      },
      {
        id: 'mock-2',
        name: category === 'food' ? 'Neighborhood Noodles' : 'Discount Store',
        rating: 4.0,
        priceLevel: 1,
        distanceMeters: 720,
        openNow: true,
        address: '456 Oak Ave',
      },
      {
        id: 'mock-3',
        name: category === 'food' ? 'Daily Dumplings' : 'Bargain Bazaar',
        rating: 3.8,
        priceLevel: 0,
        distanceMeters: 980,
        openNow: false,
        address: '789 Pine Rd',
      },
    ];

    const response = { results: mockResults };
    const parsedResponse = nearbyResponseSchema.parse(response);
    return { data: parsedResponse };
  });
}

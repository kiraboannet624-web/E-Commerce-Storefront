import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import type { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function ProductDetails() {
  const { id } = useParams();
  const { isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/public/products/${id}`);
      const body = res.data;
      return body.data?.product ?? body.data ?? body;
    },
  });

  const addToCart = useMutation({
    mutationFn: () => {
      const firstVariant = (product as any)?.variants?.[0];
      const payload: Record<string, unknown> = { productId: id, quantity: 1 };
      if (firstVariant?.id) payload.variantId = firstVariant.id;
      return api.post('/auth/cart/items', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart!');
    },
    onError: () => toast.error('Failed to add to cart'),
  });

  if (isLoading) return <div className="flex justify-center py-20 text-gray-500">Loading...</div>;
  if (!product) return <div className="flex justify-center py-20 text-red-500">Product not found.</div>;

  const title = product.name ?? product.title ?? 'Untitled';
  const image = product.images?.[0]?.url ?? 'https://placehold.co/400x300?text=No+Image';
  const isUser = isAuthenticated && userRole === 'USER';

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm mb-6 block">← Back</button>
      <div className="bg-white rounded-2xl shadow p-6 flex flex-col md:flex-row gap-8">
        <img
          src={image}
          alt={title}
          className="w-full md:w-80 h-64 object-cover rounded-xl"
          onError={(e) => ((e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image')}
        />
        <div className="flex flex-col gap-3 flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500">Brand: {product.brand}</p>
          <p className="text-gray-600 text-sm">{product.description}</p>
          <p className="text-blue-600 text-2xl font-bold">${Number(product.price).toFixed(2)}</p>
          <p className="text-sm text-gray-400">In stock: {product.stock}</p>
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/login')}
              className="mt-auto bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-medium"
            >
              Login to Add to Cart
            </button>
          )}
          {isUser && (
            <button
              onClick={() => addToCart.mutate()}
              disabled={addToCart.isPending || product.stock === 0}
              className="mt-auto bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {product.stock === 0 ? 'Out of Stock' : addToCart.isPending ? 'Adding...' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { getLocalCart, updateLocalCartQty, removeFromLocalCart, type LocalCartItem } from '../hooks/useLocalCart';
import toast from 'react-hot-toast';

interface ApiCartItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variant?: { id: string; color: string; size: string; price: number };
}

interface ApiCart {
  id: string;
  items: ApiCartItem[];
  total: number;
  itemCount: number;
}

export default function CartPage() {
  const qc = useQueryClient();
  const [localItems, setLocalItems] = useState<LocalCartItem[]>(getLocalCart());

  const { data: apiCart, isLoading } = useQuery<ApiCart>({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/auth/cart');
      const body = res.data;
      return body.data?.cart ?? body.data ?? body;
    },
  });

  const updateQtyMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.patch(`/auth/cart/items/${itemId}`, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
    onError: () => toast.error('Failed to update quantity'),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/auth/cart/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
    onError: () => toast.error('Failed to remove item'),
  });

  const updateLocal = (productId: string, quantity: number) => {
    updateLocalCartQty(productId, quantity);
    setLocalItems(getLocalCart());
  };

  const removeLocal = (productId: string) => {
    removeFromLocalCart(productId);
    setLocalItems(getLocalCart());
  };

  useEffect(() => {
    setLocalItems(getLocalCart());
  }, []);

  if (isLoading) return <div className="flex justify-center py-20 text-gray-500">Loading cart...</div>;

  const apiItems = apiCart?.items ?? [];
  const apiTotal = apiCart?.total ?? 0;
  const localTotal = localItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const grandTotal = apiTotal + localTotal;
  const isEmpty = apiItems.length === 0 && localItems.length === 0;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Cart</h1>
      {isEmpty ? (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-4">Your cart is empty.</p>
          <Link to="/" className="text-blue-600 hover:underline">Continue Shopping</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {/* API cart items (with variants) */}
            {apiItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.productName}</p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                  {item.variant && <p className="text-xs text-gray-500">{item.variant.color} - {item.variant.size}</p>}
                  <p className="text-blue-600 font-bold">${Number(item.unitPrice).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQtyMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })} disabled={item.quantity <= 1} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold disabled:opacity-40">-</button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQtyMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">+</button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${Number(item.subtotal).toFixed(2)}</p>
                  <button onClick={() => removeMutation.mutate(item.id)} className="text-red-500 hover:text-red-700 text-xs mt-1">Remove</button>
                </div>
              </div>
            ))}

            {/* Local cart items (no variants) */}
            {localItems.map((item) => (
              <div key={item.productId} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                <img src={item.image || 'https://placehold.co/60x60?text=?'} alt={item.name} className="w-14 h-14 object-cover rounded-lg" onError={(e) => ((e.target as HTMLImageElement).src = 'https://placehold.co/60x60?text=?')} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-blue-600 font-bold">${Number(item.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateLocal(item.productId, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold disabled:opacity-40">-</button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateLocal(item.productId, item.quantity + 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">+</button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  <button onClick={() => removeLocal(item.productId)} className="text-red-500 hover:text-red-700 text-xs mt-1">Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-white rounded-xl shadow p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{apiItems.length + localItems.length} item(s)</p>
              <span className="font-bold text-gray-800 text-lg">Total: ${grandTotal.toFixed(2)}</span>
            </div>
            <Link to="/checkout" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
              Checkout
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

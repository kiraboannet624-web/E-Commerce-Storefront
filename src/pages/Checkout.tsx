import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import FormInput from '../Components/FormInput';
import { getLocalCart, clearLocalCart } from '../hooks/useLocalCart';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variant?: { color: string; size: string };
}

interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required').refine((v) => v.trim().length > 0, 'Cannot be empty'),
  shippingAddress: z.string().min(1, 'Address is required').refine((v) => v.trim().length > 0, 'Cannot be empty'),
  city: z.string().min(1, 'City is required').refine((v) => v.trim().length > 0, 'Cannot be empty'),
  postalCode: z.string().optional(),
  phoneNumber: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
});

type ShippingForm = z.infer<typeof schema>;
const STEPS = ['Shipping', 'Review', 'Confirm'];

export default function Checkout() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: cart } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/auth/cart');
      const body = res.data;
      return body.data?.cart ?? body.data ?? body;
    },
  });

  const { register, trigger, getValues, formState: { errors } } = useForm<ShippingForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const localItems = getLocalCart();
      // Place API cart order
      if ((cart?.items ?? []).length > 0) {
        await api.post('/auth/orders', {});
      }
      // Place individual orders for local cart items
      for (const item of localItems) {
        await api.post('/auth/orders/buy', { productId: item.productId, quantity: item.quantity });
      }
      clearLocalCart();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      toast.success('Order placed successfully!');
      navigate('/orders');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to place order'),
  });

  const nextStep = async () => {
    if (step === 0) {
      const valid = await trigger(['fullName', 'shippingAddress', 'city', 'phoneNumber']);
      if (valid) setStep(1);
    } else {
      setStep((s) => s + 1);
    }
  };

  const items = cart?.items ?? [];

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</div>
            <span className={`text-sm ml-1 ${i <= step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
        {step === 0 && (
          <>
            <FormInput label="Full Name" {...register('fullName')} error={errors.fullName?.message} />
            <FormInput label="Shipping Address" {...register('shippingAddress')} error={errors.shippingAddress?.message} />
            <FormInput label="City" {...register('city')} error={errors.city?.message} />
            <FormInput label="Postal Code (optional)" {...register('postalCode')} error={errors.postalCode?.message} />
            <FormInput label="Phone Number (10 digits)" {...register('phoneNumber')} error={errors.phoneNumber?.message} />
          </>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-gray-700">Order Summary</h3>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm text-gray-600">
                <span>{i.productName} {i.variant ? `(${i.variant.color})` : ''} × {i.quantity}</span>
                <span>${Number(i.subtotal).toFixed(2)}</span>
              </div>
            ))}
            {getLocalCart().map((i) => (
              <div key={i.productId} className="flex justify-between text-sm text-gray-600">
                <span>{i.name} × {i.quantity}</span>
                <span>${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold text-gray-800">
              <span>Total</span>
              <span>${(Number(cart?.total ?? 0) + getLocalCart().reduce((s, i) => s + i.price * i.quantity, 0)).toFixed(2)}</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-gray-700">Confirm Order</h3>
            <div className="text-sm text-gray-600 flex flex-col gap-1">
              <p><strong>Name:</strong> {getValues('fullName')}</p>
              <p><strong>Address:</strong> {getValues('shippingAddress')}, {getValues('city')}</p>
              <p><strong>Phone:</strong> {getValues('phoneNumber')}</p>
              <p><strong>Total:</strong> ${Number(cart?.total ?? 0).toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Back</button>
          )}
          {step < 2 ? (
            <button type="button" onClick={nextStep} className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">Next</button>
          ) : (
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || (items.length === 0 && getLocalCart().length === 0)}
              className="ml-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
            >
              {mutation.isPending ? 'Placing...' : 'Place Order'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

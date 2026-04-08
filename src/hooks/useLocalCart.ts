// Local cart for products without variants (API doesn't support them in cart)
export interface LocalCartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

const KEY = 'local_cart';

export function getLocalCart(): LocalCartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addToLocalCart(item: Omit<LocalCartItem, 'quantity'>) {
  const cart = getLocalCart();
  const existing = cart.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function updateLocalCartQty(productId: string, quantity: number) {
  const cart = getLocalCart().map((i) =>
    i.productId === productId ? { ...i, quantity } : i
  ).filter((i) => i.quantity > 0);
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function removeFromLocalCart(productId: string) {
  const cart = getLocalCart().filter((i) => i.productId !== productId);
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function clearLocalCart() {
  localStorage.removeItem(KEY);
}

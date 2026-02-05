import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
interface CartItem {
    menuItemId: string;
    name: string;
    nameFr?: string;
    nameAr?: string;
    price: number;
    quantity: number;
    notes?: string;
}

interface CartState {
    items: CartItem[];
    tableId: string | null;
    restaurantId: string | null;
    token: string | null;
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (menuItemId: string) => void;
    updateQuantity: (menuItemId: string, quantity: number) => void;
    updateNotes: (menuItemId: string, notes: string) => void;
    clearCart: () => void;
    setTableInfo: (tableId: string, restaurantId: string, token: string) => void;
    getTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            tableId: null,
            restaurantId: null,
            token: null,

            addItem: (item) => {
                set((state) => {
                    const existing = state.items.find(i => i.menuItemId === item.menuItemId);

                    if (existing) {
                        return {
                            items: state.items.map(i =>
                                i.menuItemId === item.menuItemId
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i
                            ),
                        };
                    }

                    return {
                        items: [...state.items, { ...item, quantity: 1 }],
                    };
                });
            },

            removeItem: (menuItemId) => {
                set((state) => ({
                    items: state.items.filter(i => i.menuItemId !== menuItemId),
                }));
            },

            updateQuantity: (menuItemId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(menuItemId);
                    return;
                }

                set((state) => ({
                    items: state.items.map(i =>
                        i.menuItemId === menuItemId
                            ? { ...i, quantity: Math.min(quantity, 20) }
                            : i
                    ),
                }));
            },

            updateNotes: (menuItemId, notes) => {
                set((state) => ({
                    items: state.items.map(i =>
                        i.menuItemId === menuItemId
                            ? { ...i, notes }
                            : i
                    ),
                }));
            },

            clearCart: () => {
                set({ items: [] });
            },

            setTableInfo: (tableId, restaurantId, token) => {
                set({ tableId, restaurantId, token });
            },

            getTotal: () => {
                return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            },

            getItemCount: () => {
                return get().items.reduce((sum, item) => sum + item.quantity, 0);
            },
        }),
        {
            name: 'qr-cafe-cart',
            partialize: (state) => ({
                items: state.items,
                tableId: state.tableId,
                restaurantId: state.restaurantId,
                token: state.token,
            }),
        }
    )
);

// Order tracking store
interface OrderState {
    currentOrderId: string | null;
    setCurrentOrder: (orderId: string | null) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
    currentOrderId: null,
    setCurrentOrder: (orderId) => set({ currentOrderId: orderId }),
}));

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type ProductNavigationContextValue = {
  readonly homeHref: string;
};

const ProductNavigationContext = createContext<ProductNavigationContextValue>({
  homeHref: '/',
});

export function ProductNavigationProvider({
  homeHref,
  children,
}: {
  readonly homeHref: string;
  readonly children: ReactNode;
}) {
  const value = useMemo(() => ({ homeHref }), [homeHref]);
  return (
    <ProductNavigationContext.Provider value={value}>{children}</ProductNavigationContext.Provider>
  );
}

export function useProductNavigation(): ProductNavigationContextValue {
  return useContext(ProductNavigationContext);
}

import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';

interface WrapperProps {
  children: ReactNode;
}

function DefaultWrapper({ children }: WrapperProps): ReactElement {
  return <>{children}</>;
}

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  wrapper?: React.ComponentType<WrapperProps>;
};

function customRender(ui: ReactElement, options?: CustomRenderOptions): ReturnType<typeof render> {
  const { wrapper: Wrapper = DefaultWrapper, ...rest } = options ?? {};
  return render(ui, { wrapper: Wrapper, ...rest });
}

export * from '@testing-library/react';
export { customRender as render };

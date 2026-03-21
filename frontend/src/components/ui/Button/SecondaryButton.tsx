import { forwardRef } from 'react';
import { Button, type ButtonBaseProps } from './Button';

type SecondaryButtonProps = Omit<ButtonBaseProps, 'variant'>;

export const SecondaryButton = forwardRef<HTMLButtonElement, SecondaryButtonProps>((props, ref) => (
  <Button ref={ref} variant="secondary" {...props} />
));

SecondaryButton.displayName = 'SecondaryButton';

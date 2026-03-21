import { forwardRef } from 'react';
import { Button, type ButtonBaseProps } from './Button';

type OutlineButtonProps = Omit<ButtonBaseProps, 'variant'>;

export const OutlineButton = forwardRef<HTMLButtonElement, OutlineButtonProps>((props, ref) => (
  <Button ref={ref} variant="outline" {...props} />
));

OutlineButton.displayName = 'OutlineButton';

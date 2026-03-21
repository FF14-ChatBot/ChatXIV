import { forwardRef } from 'react';
import { Button, type ButtonBaseProps } from './Button';

type GhostButtonProps = Omit<ButtonBaseProps, 'variant'>;

export const GhostButton = forwardRef<HTMLButtonElement, GhostButtonProps>((props, ref) => (
  <Button ref={ref} variant="ghost" {...props} />
));

GhostButton.displayName = 'GhostButton';

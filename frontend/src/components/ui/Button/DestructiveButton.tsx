import { forwardRef } from 'react';
import { Button, type ButtonBaseProps } from './Button';

type DestructiveButtonProps = Omit<ButtonBaseProps, 'variant'>;

export const DestructiveButton = forwardRef<HTMLButtonElement, DestructiveButtonProps>(
  (props, ref) => <Button ref={ref} variant="destructive" {...props} />
);

DestructiveButton.displayName = 'DestructiveButton';

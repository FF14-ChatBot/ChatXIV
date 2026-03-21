import { forwardRef } from 'react';
import { Button, type ButtonBaseProps } from './Button';

type LinkButtonProps = Omit<ButtonBaseProps, 'variant'>;

export const LinkButton = forwardRef<HTMLButtonElement, LinkButtonProps>((props, ref) => (
  <Button ref={ref} variant="link" {...props} />
));

LinkButton.displayName = 'LinkButton';

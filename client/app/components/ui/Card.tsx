interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ hoverable = false, className = '', children, ...rest }: CardProps) {
  const hover = hoverable
    ? 'transition-all duration-150 hover:shadow-pop hover:-translate-y-0.5'
    : '';
  return (
    <div className={`bg-surface border border-line rounded-card shadow-card ${hover} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-4 border-b border-line ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

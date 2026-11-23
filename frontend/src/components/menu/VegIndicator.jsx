/**
 * Standard Indian FSSAI compliant Veg / Non-Veg indicator
 */
export default function VegIndicator({ foodType, size = 'md' }) {
  const isVeg = foodType === 'veg';

  const boxSizes = {
    sm: 'h-3.5 w-3.5 p-0.5 border',
    md: 'h-4 w-4 p-0.5 border-1.5',
    lg: 'h-5 w-5 p-1 border-2',
  };

  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xs shrink-0 ${boxSizes[size]} ${
        isVeg
          ? 'border-emerald-600 bg-white'
          : 'border-red-600 bg-white'
      }`}
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
      aria-label={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      <div
        className={`rounded-full ${dotSizes[size]} ${
          isVeg ? 'bg-emerald-600' : 'bg-red-600'
        }`}
      />
    </div>
  );
}

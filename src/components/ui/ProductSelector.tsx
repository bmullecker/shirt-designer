import React from 'react';
import { useDesign, ShirtType, ShirtSize } from '../../context/DesignContext';

export const ProductSelector: React.FC = () => {
  const { state, setCurrentShirt } = useDesign();

  const types: ShirtType[] = ['t-shirt', 'hoodie', 'long-sleeve'];
  const colors = [
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#000000' },
    { name: 'Navy', value: '#1e293b' },
    { name: 'Slate', value: '#64748b' },
    { name: 'Rose', value: '#f43f5e' },
  ];
  const sizes: ShirtSize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

  return (
    <div className="glass-card">
      <div className="selector-section">
        <h3>Apparel Type</h3>
        <div className="pill-group">
          {types.map((type) => (
            <button
              key={type}
              className={`pill ${state.currentShirt.type === type ? 'active' : ''}`}
              onClick={() => setCurrentShirt({ ...state.currentShirt, type })}
            >
              {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="selector-section">
        <h3>Color Palette</h3>
        <div className="swatch-group">
          {colors.map((color) => (
            <button
              key={color.value}
              title={color.name}
              className={`swatch ${state.currentShirt.color === color.value ? 'active' : ''}`}
              style={{ '--swatch-color': color.value } as any}
              onClick={() => setCurrentShirt({ ...state.currentShirt, color: color.value })}
            />
          ))}
        </div>
      </div>

      <div className="selector-section no-margin">
        <h3>Select Size</h3>
        <div className="size-grid">
          {sizes.map((size) => (
            <button
              key={size}
              className={`size-btn ${state.currentShirt.size === size ? 'active' : ''}`}
              onClick={() => setCurrentShirt({ ...state.currentShirt, size })}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

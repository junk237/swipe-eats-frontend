import React from "react";
import { PRICE_LEVELS } from '@/constants/priceLevels';
import PriceLevelOption from './PriceLevelOption';
import styles from './PriceLevelSelector.module.css';

type PriceLevelSelectorProps = {
  selectedPriceLevels: number[];
  onSelectedPriceLevelsChange: (selectedPriceLevels: number[]) => void;
};

const PriceLevelSelector: React.FC<PriceLevelSelectorProps> = ({
  selectedPriceLevels,
  onSelectedPriceLevelsChange,
}) => {
  const handleLevelClick = (level: number) => {
    if (selectedPriceLevels.includes(level)) {
      onSelectedPriceLevelsChange(selectedPriceLevels.filter((l) => l !== level));
    } else {
      onSelectedPriceLevelsChange([...selectedPriceLevels, level]);
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>価格帯</h3>
      <div className="options">
        {PRICE_LEVELS.map((priceLevel) => (
          <PriceLevelOption
            key={priceLevel.level}
            level={priceLevel.level}
            label={priceLevel.label}
            isSelected={selectedPriceLevels.includes(priceLevel.level)}
            onLevelClick={handleLevelClick}
          />
        ))}
      </div>
    </div>
  );
};

export default PriceLevelSelector;
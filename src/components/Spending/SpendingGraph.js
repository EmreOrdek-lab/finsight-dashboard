import React, { useCallback } from 'react';
import { ResponsiveContainer, PieChart, Pie, Sector, Cell } from "recharts";
import { useLanguage } from '../../context/LanguageContext';

function Spending(props) {
    const { t } = useLanguage();
    const onMouseOver = useCallback((data, index) => {
      props.toSetCurrentCategory(index);
    }, []); // eslint-disable-line

    const onMouseLeave = useCallback((data, index) => {
      props.toSetCurrentCategory(null);
    }, []); // eslint-disable-line

    let colors = ['#0f766e', '#1d4ed8', '#475569', '#b45309', '#7c2d12', '#334155'];

    const renderActiveShape = props => {
      const RADIAN = Math.PI / 180;
      const {
        cx,
        cy,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
        midAngle
      } = props;
      const sin = Math.sin(-RADIAN * midAngle);
      const cos = Math.cos(-RADIAN * midAngle);
      const sx = cx + (outerRadius - 85) * cos;
      const sy = cy + (outerRadius - 85) * sin;
      return (
        <Sector
          cx={sx}
          cy={sy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={props.payload.fill}
        />
      );
    };

    return (
        <figure data-testid="spendingGraph" className="mx-auto h-[300px] w-full max-w-[360px]" aria-label={t('spending.pieChartAria')}>
           <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={props.currentCategory}
                data={props.formattedTransactions}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                stroke= "#27272a"
                outerRadius={100}
                activeShape={renderActiveShape}
                onMouseOver={onMouseOver}
                onMouseLeave={onMouseLeave}
              >
              {props.formattedTransactions.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </figure>
    );
}

export default Spending;

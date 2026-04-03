import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Label } from 'recharts';

function AnalyticsGraph(props) {
  const [ graphDataPoints , setGraphDataPoints ] = useState([]);
  const [ graphCategories, setGraphCategories ] = useState([]);


  useEffect(() => {
    // creates all data points for graph
    const createDataPoints = (transactions) => {
      if(transactions !== undefined && Object.keys(transactions).length){
        let dataPoints = [];
        let biggestAmount = 0;
        const uniqueDates = [...new Set(Object.values(transactions).map(item => item.date))];
        const uniqueCategories = [...new Set(Object.values(transactions).map(item => item.category))];
        let newCategories = uniqueCategories.filter((category) => {
          if(category !== 'Money In' && category !== 'Transfer' && category !== 'Credit Card Payment'){
            return category;
          } else {
            return false;
          }
        });
        setGraphCategories(newCategories);

        uniqueDates.forEach((date) => {
            let emptyObj = { 'date': date };
            Object.values(transactions).forEach((transaction) => {
                if(transaction.date === date){
                    if((Object.keys(emptyObj).includes(transaction.category)) && transaction.category !== 'Money In' && transaction.category !== 'Transfer'  && transaction.category !== 'Credit Card Payment'){
                        emptyObj[transaction.category] += parseFloat(transaction.value);
                    } else if( transaction.category !== 'Money In' && transaction.category !== 'Transfer'  && transaction.category !== 'Credit Card Payment' ){
                        emptyObj[transaction.category] = parseFloat(transaction.value);
                    }
                }
            })
            if(Object.keys(emptyObj).length > 1){
              dataPoints.push(emptyObj);
          }
        })

        if(dataPoints.length){
          dataPoints.forEach((point) => {
            Object.values(point).forEach((value, index) => {
              if(biggestAmount < value && index !== 0){
                biggestAmount = value;
              }
            });
          })
          dataPoints[0].amount = biggestAmount;
        }
        
        let sortedPoints = [];
        while(dataPoints.length){
            let currentSmallestIndex = 0;
            for(let i = 0; i <= dataPoints.length -1; i++){
                if(parseInt(dataPoints[i].date) < parseInt(dataPoints[currentSmallestIndex].date)){
                    currentSmallestIndex = i;
                }
            }
            sortedPoints.push(dataPoints.splice(currentSmallestIndex, 1));
        }
        setGraphDataPoints(sortedPoints.flat());
      }
    };
    createDataPoints(props.transactions);
  }, [props.transactions]); // eslint-disable-line

  let colors = ['#0f766e', '#1d4ed8', '#475569', '#b45309', '#7c2d12', '#334155'];
  const axisColor = props.theme === 'dark' ? '#71717a' : '#64748b';
  const tooltipStyles = {
    borderRadius: 8,
    border: `1px solid ${props.theme === 'dark' ? '#3f3f46' : '#cbd5e1'}`,
    backgroundColor: props.theme === 'dark' ? '#18181b' : '#ffffff',
    color: props.theme === 'dark' ? '#f8fafc' : '#0f172a'
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden pt-1">
        <h3 className="text-xl text-slate-900 dark:text-slate-100 xl:hidden">Trends</h3>
      {props.transactions === undefined ?
        <div className="py-4 text-center text-slate-600 dark:text-zinc-400">Add Transactions to see your Trends chart</div>  
      :
        <div data-testid="analyticsGraph" className="h-full w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width="100%" height="100%" data={graphDataPoints}
              margin={{top: 10, right: 10, left: 20, bottom: 20}}>
                <CartesianGrid strokeDasharray="4 4" stroke={props.theme === 'dark' ? '#52525b33' : '#cbd5e166'} />
                <XAxis dataKey="date" type='number' height={25} tickCount="6" ticks={[5, 10, 15, 20, 25, 30]} stroke={axisColor} tick={{ fill: axisColor, fontSize: 12 }}>
                  <Label
                    style={{
                      textAnchor: "middle",
                      fontSize: "100%",
                      fill: axisColor,
                      paddingBottom: '10px',
                    }}
                    position='bottom'
                    value={"Day of month"}
                  />
                </XAxis>
                <YAxis dataKey="amount" width={55} stroke={axisColor} tick={{ fill: axisColor, fontSize: 12 }}>
                  <Label 
                  style={{
                    textAnchor: "middle",
                    fontSize: "100%",
                    fill: axisColor,
                    paddingBottom: '10px',
                  }}
                  position='left'
                  angle={270} 
                  value={"Amount ($)"}/>
                </YAxis>
                <Tooltip contentStyle={tooltipStyles} />
                <Legend wrapperStyle={{ color: axisColor }} />
                {graphCategories.map((category, index) => {
                  return(
                    <Line type="monotone" 
                    dataKey={category} 
                    stroke={`${colors[index]}`} 
                    key={index} 
                    strokeWidth={3}
                    activeDot
                    connectNulls 
                    legendType={'none'}/>
                  )
                })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      }
    </div>
  );
}

export default AnalyticsGraph;
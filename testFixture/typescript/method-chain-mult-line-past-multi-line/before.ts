new Promise((resolve)=>setTimeout(resolve, 1))
    .then(()=>console.log(1))
    .then(()=>{/*cursor*/
        console.log(2)
    })
    .then(()=>{
        console.log(3)
    })
    .then(()=>console.log(4));
new Promise((resolve)=>setTimeout(resolve, 1))
    .then(()=>console.log(1))
    .then(()=>{
        console.log(2)
    })
    .then(()=>console.log(3));
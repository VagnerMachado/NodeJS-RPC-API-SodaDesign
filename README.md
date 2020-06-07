# NodeJS-RPC-API-SodaDesign

This project explores RPC APIs by creating our own soda design API. When the file is executed, it uses the third party npm package JIMP load images into memory before the server is started. 

After that, the server is started and and receives as input arguments an array of Jimp images for the can and an array of Jimp images with fruit flavors. There is also a crab cola flavor if the user wanna take fun to another level :)   

The server listens to port 3000 and root access causes it to serve the index.html page with a form where users can choose a color for the can and the flavor for the soda. Clicking submit in this form, sends the data for the color and the flavor to the /design directory in the web API. 

There, the input is processed and a filename is created. Case the filename, created using the flavor and RGB values for the can, is already in cache, that cached can is delivered.   

Case the can is not in cache, we use JIMP to clone and  gray scale the body of the can. Then we use JIPM to layer images in this order: can lid, can body, can sticker, flavor and then  write the image to cache directory.   

Finally, we proceed to deliver the can to the user by opening a read stream and piping that .png image to the remote socket for response. Errors are caught during parsing, i.e injecting into the URL a non existing flavor causes a 404 error while injecting a non existing color causes white to be delivered as can color. A catch all error page is provided so any indesired traffic to non existing or non authorized directories are routed to a 404 error page.    

The image delivered to user can be dragged, right clicked and saved onto the user's system.   


*Vagner*
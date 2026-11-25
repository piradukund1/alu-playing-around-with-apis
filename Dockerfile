# PhilFindsJobs web server image: Nginx + the 3 site files + nginx/web.conf
FROM nginx:alpine
COPY index.html style.css app.js /var/www/PhilFindsJobs/
COPY nginx/web.conf /web.conf
# Web01 or Web02, shown in the "Served by" badge
ENV SERVER_NAME=Web01
CMD sh -c "sed \"s/WEB_NAME/$SERVER_NAME/g\" /web.conf > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"
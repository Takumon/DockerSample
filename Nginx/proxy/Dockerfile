FROM nginx:1.13.8
COPY etc/nginx/conf.d/* /etc/nginx/conf.d/
ENTRYPOINT /usr/sbin/nginx -g 'daemon off;' -c /etc/nginx/nginx.conf
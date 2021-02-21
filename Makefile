docker-compose:
	@clear
	@docker-compose up --build

docker-hub:
	@docker build -t tzador/bicoin-worker:v11 .
	@docker push  tzador/bicoin-worker:v11

nodejs:
	@cd node.js && nodemon

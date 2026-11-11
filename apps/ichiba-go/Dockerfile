FROM golang:1.26-alpine AS build

WORKDIR /src

# Dependency layer first: module files cache the download between builds.
COPY apps/ichiba-go/go.mod apps/ichiba-go/go.sum ./
RUN go mod download

COPY apps/ichiba-go/*.go ./
COPY apps/ichiba-go/testdata ./testdata
# CGO off → static binary; runs anywhere, ~10MB image total (vs ~150MB for
# the python slim image — one of the language-comparison data points).
RUN CGO_ENABLED=0 go build -o /ichiba-go .

FROM alpine:3.21

COPY --from=build /ichiba-go /usr/local/bin/ichiba-go

ENV PORT=3022
EXPOSE 3022
# No gunicorn equivalent needed: net/http is production-grade out of the box.
CMD ["ichiba-go"]

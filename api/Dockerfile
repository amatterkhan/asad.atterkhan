FROM golang:1.27.3-bookworm AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /server /server
USER nonroot:nonroot
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["/server"]

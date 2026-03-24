FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
# Download dependencies first to cache them
RUN mvn dependency:go-offline -B

COPY src ./src

RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

# Create a non-root user with UID/GID 1000 (standard for VPS users)
RUN groupadd -g 1000 javauser && \
    useradd -u 1000 -g javauser --system --create-home javauser

COPY --from=build /app/target/*.jar app.jar

# Create logs and data directories and change ownership
RUN mkdir -p /app/logs /app/data/ticket-images && \
    chown -R javauser:javauser /app/logs /app/data/ticket-images /app

# Switch to non-root user
USER javauser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
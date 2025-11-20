FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
# Download dependencies first to cache them
RUN mvn dependency:go-offline -B

COPY src ./src

RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

# Create a non-root user
RUN addgroup --system javauser && adduser --system --ingroup javauser javauser

COPY --from=build /app/target/*.jar app.jar

# Create logs directory and change ownership
RUN mkdir -p /app/logs && chown -R javauser:javauser /app

# Switch to non-root user
USER javauser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
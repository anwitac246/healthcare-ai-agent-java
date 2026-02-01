package com.aethercare.backend.map_service.config;

import com.aethercare.backend.map_service.common.MapConstants;
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebClientConfig {
    
    @Bean
    public WebClient nominatimClient() {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 30000)
                .responseTimeout(Duration.ofSeconds(30))
                .doOnConnected(conn -> 
                    conn.addHandlerLast(new ReadTimeoutHandler(30, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(30, TimeUnit.SECONDS))
                );
        
        return WebClient.builder()
                .baseUrl(MapConstants.NOMINATIM_BASE_URL)
                .defaultHeader("User-Agent", MapConstants.USER_AGENT)
                .defaultHeader("Accept", "application/json")
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }
    
    @Bean
    public WebClient overpassClient() {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 30000)
                .responseTimeout(Duration.ofSeconds(30))
                .doOnConnected(conn -> 
                    conn.addHandlerLast(new ReadTimeoutHandler(30, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(30, TimeUnit.SECONDS))
                );
        
        return WebClient.builder()
                .baseUrl(MapConstants.OVERPASS_BASE_URL)
                .defaultHeader("User-Agent", MapConstants.USER_AGENT)
                .defaultHeader("Accept", "application/json")
                .defaultHeader("Content-Type", "application/x-www-form-urlencoded")
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }
}
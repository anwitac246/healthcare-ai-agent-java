- The test folder structure should match the main source code folder structure.
- The standard template for testing files:
```java
package com.project.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ClassNameTest {

    @Mock
    private DependencyClass dependency;

    @InjectMocks
    private ClassName className;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldDoSomethingWhenCondition() {

        // Arrange

        // Act

        // Assert
    }

}
```